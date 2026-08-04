import OpenAI from "openai";

interface Section {
  title: string;
  section_number: string | null;
  tags: string[];
  body: string;
  full: string;
}

interface Chunk {
  content: string;
  meta: {
    title: string;
    tags: string[];
    sectionNumber: string | null;
    index: number;
  };
}

interface Vector {
  id: string;
  values: number[];
  metadata: {
    text: string;
    source: string;
    section: string;
    topic: string;
    tags: string;
    version: string;
    chunkIndex: string;
    firstSentence: string;
  };
}

interface ProcessTextContentResult {
  source: string;
  version: string;
  totalChunksStored?: number;
  totalPreviewChunks?: number;
  chunks?: Chunk[];
}

export class ChunkingUploader {
  private openai: OpenAI;
  private vectorize: VectorizeIndex;
  private fileDb: any;
  private db: D1Database;
  private maxTokens: number;
  private overlap: number;
  private model: string;
  private concurrency: number;
  private debug: boolean;
  private limit: (fn: () => Promise<any>) => Promise<any>;

  constructor(
    apiKey: string,
    vectorize: VectorizeIndex,
    fileDb: any,
    db: D1Database,
    options: Partial<{
      maxTokens: number;
      overlap: number;
      concurrency: number;
      debug: boolean;
    }> = {}
  ) {
    this.openai = new OpenAI({ apiKey });
    this.vectorize = vectorize;
    this.fileDb = fileDb;
    this.db = db;
    this.maxTokens = options.maxTokens || 800;
    this.overlap = options.overlap || 100;
    this.model = "text-embedding-ada-002";
    this.concurrency = options.concurrency || 3;
    this.debug = options.debug || false;
    this.limit = this.createPLimit();
  }

  private createPLimit(): (fn: () => Promise<any>) => Promise<any> {
    const queue: (() => void)[] = [];
    let activeCount = 0;

    const next = () => {
      activeCount--;
      if (queue.length > 0) queue.shift()!();
    };

    return (fn) => {
      return new Promise((resolve) => {
        const run = async () => {
          activeCount++;
          try {
            resolve(await fn());
          } finally {
            next();
          }
        };

        if (activeCount < this.concurrency) {
          run();
        } else {
          queue.push(run);
        }
      });
    };
  }

  async extractSemanticSections(text: string): Promise<Section[]> {
    const sections: Section[] = [];
    text = text.replace(/NAC\s+624\.\s*(\d{3})/g, "NAC 624.$1");
    const maxLen = 30000;

    for (let i = 0; i < text.length; i += maxLen) {
      const chunk = text.slice(i, i + maxLen);
      const prompt = `Split the following legal text into a JSON array of sections with: title, content, tags, section_number.\nTEXT:\n${chunk}`;

      try {
        const res = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "You are an expert in legal document processing. Return only valid JSON." 
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        });

        const raw = res.choices[0]?.message?.content?.trim() || "{}";
        const parsed = JSON.parse(raw);
        const sectionArray = Array.isArray(parsed) ? parsed : parsed.sections || [];

        sectionArray.forEach((s: any, idx: number) => {
          sections.push({
            title: s.title || `Section ${idx + 1}`,
            section_number: s.section_number || null,
            tags: Array.isArray(s.tags) ? s.tags : [],
            body: s.content || s.body || "",
            full: `${s.title || ''} ${s.content || s.body || ''}`.trim()
          });
        });
      } catch (err: any) {
        console.error(`Section parse error: ${err.message}`);
        throw new Error("Failed to parse document sections");
      }
    }

    if (!sections.length) {
      return text.split(/(?=^(NAC|NRS)\s+\d{2,4}(\.\d{1,4})?)/gm)
        .filter(t => t.trim().length > 0)
        .map((t, i) => ({
          title: t.split("\n")[0]?.trim() || `Section ${i}`,
          section_number: null,
          tags: [],
          body: t,
          full: t
        }));
    }

    return sections;
  }

  private async batchEmbedChunks(chunks: string[]): Promise<number[][]> {
    const results: number[][] = [];
    
    for (let i = 0; i < chunks.length; i += 10) {
      const batch = chunks.slice(i, i + 10);
      
      try {
        const res = await this.withRetry(() =>
          this.openai.embeddings.create({
            model: this.model,
            input: batch
          })
        );
        
        res.data.forEach(d => results.push(d.embedding));
      } catch (err:any) {
        console.error(`Failed to embed batch starting at chunk ${i}: ${err.message}`);
        throw err;
      }
    }
    
    return results;
  }

  async processTextContent(
    text: string,
    source: string,
    version: string,
    review = false
  ): Promise<ProcessTextContentResult> {
    if (!text || typeof text !== "string") {
      throw new Error("No valid text provided");
    }

    // Basic RTF/HTML stripping
    if (text.includes("{\\rtf") || text.includes("<html")) {
      text = this.stripRTF(text);
    }

    const sections = await this.extractSemanticSections(text);
    const chunks: Chunk[] = [];

    for (const section of sections) {
      const chunkTexts = this.splitIntoChunks(section.full, this.maxTokens, this.overlap);
      chunkTexts.forEach((c, i) => {
        chunks.push({
          content: c,
          meta: {
            title: section.title,
            tags: section.tags,
            sectionNumber: section.section_number,
            index: i
          }
        });
      });
    }

    if (review) {
      return {
        source,
        version,
        totalPreviewChunks: chunks.length,
        chunks
      };
    }

    try {
      const embeddings = await this.batchEmbedChunks(chunks.map(c => c.content));

      await Promise.all(
        embeddings.map((embedding, i) =>
          this.limit(async () => {
            const chunk = chunks[i];
            const vectorId = await this.hashText(`${chunk.content}-${version}`);

            const vector: Vector = {
              id: vectorId,
              values: embedding,
              metadata: {
                text: String(chunk.content?.slice(0, 1000) || ""),
                source: String(source || ""),
                section: String(chunk.meta.title || ""),
                topic: String((chunk.meta.title || "").toLowerCase().split(" ")[0] || "general"),
                tags: Array.isArray(chunk.meta.tags) ? chunk.meta.tags.join(",") : String(chunk.meta.tags || ""),
                version: String(version || ""),
                chunkIndex: String(chunk.meta.index ?? ""),
                firstSentence: String(chunk.content?.split(/[.!?]/)[0]?.trim()?.slice(0, 300) || "")
              }
            };

            try {
              await this.withRetry(() => this.vectorize.upsert([vector]));
              await this.withRetry(() =>
                this.fileDb.saveChunk(
                  this.db,
                  source,
                  vector.id,
                  chunk.content,
                  version,
                  chunk.meta.tags,
                  vector.metadata.topic,
                  vector.metadata.firstSentence,
                  chunk.meta.title,
                  chunk.meta.index,
                  chunk.meta.sectionNumber
                )
              );
            } catch (err:any) {
              console.error(`Failed to store chunk ${i}: ${err.message}`);
              throw err;
            }
          })
        )
      );

      return {
        source,
        version,
        totalChunksStored: embeddings.length
      };
    } catch (err:any) {
      console.error(`Failed to process text content: ${err.message}`);
      throw new Error("Text processing failed");
    }
  }

  private splitIntoChunks(text: string, maxTokens = 800, overlap = 100): string[] {
    const lines = text.split("\n");
    const chunks: string[] = [];
    const current: string[] = [];

    for (const line of lines) {
      const potential = [...current, line].join("\n");
      if (this.estimateTokens(potential) > maxTokens && current.length > 0) {
        chunks.push(current.join("\n"));
        current.splice(0, current.length - Math.min(overlap, current.length));
      }
      current.push(line);
    }

    if (current.length) chunks.push(current.join("\n"));
    return chunks;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.replace(/\s+/g, " ").length / 4);
  }

  private stripRTF(text: string): string {
    return text
      .replace(/\\pard?/g, "\n")
      .replace(/\\[a-z]+\d* ?/g, "")
      .replace(/[{}]/g, "")
      .replace(/\\'/g, "")
      .replace(/[\r\n]+/g, "\n")
      .trim();
  }

  private async hashText(text: string): Promise<string> {
    const buffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1) throw err;
        console.warn(`Retry ${i + 1} failed, waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay * (i + 1)));
      }
    }
    throw new Error("Retry exhausted");
  }
}