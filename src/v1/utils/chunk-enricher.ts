/**
 * Chunk Enricher
 * Enhances chunks with better sections, tags, and topic classifications
 * Makes chunks more semantically rich for better RAG retrieval
 */

interface Chunk {
  content: string;
  section: string;
  tags?: string[];
  topic?: string;
  index: number;
  tier?: string;
  parentId?: string | null;
}

interface EnrichedChunk extends Chunk {
  tags: string[];
  topic: string;
  tier: string;
  parentId: string | null;
  enriched: true;
  firstSentencePreview: string;
  contentLength: number;
  estimatedReadingTime: number;
}

export class ChunkEnricher {
  /**
   * Enrich a single chunk
   */
  static enrichChunk(chunk: Chunk, context?: string): EnrichedChunk {
    const enriched: EnrichedChunk = {
      ...chunk,
      tier: chunk.tier || "small",
      parentId: chunk.parentId || null,
      tags: this.enhanceTags(chunk.content, chunk.tags),
      topic: chunk.topic || this.determineTopic(chunk.content, chunk.section),
      enriched: true,
      firstSentencePreview: this.extractFirstSentence(chunk.content),
      contentLength: chunk.content.length,
      estimatedReadingTime: Math.max(1, Math.round(chunk.content.split(/\s+/).length / 200)),
    };

    // Improve section names
    enriched.section = this.improveSection(enriched.section, enriched.content, context);

    return enriched;
  }

  /**
   * Enrich multiple chunks, considering context and relationships
   */
  static enrichChunks(chunks: Chunk[], context?: string): EnrichedChunk[] {
    const enriched = chunks.map((ch, idx) => {
      const prevContext = idx > 0 ? chunks[idx - 1].content : undefined;
      const nextContext = idx < chunks.length - 1 ? chunks[idx + 1].content : undefined;
      const allContext = [prevContext, context, nextContext].filter(Boolean).join(" ");

      return this.enrichChunk(ch, allContext);
    });

    // Cross-reference related chunks
    for (let i = 0; i < enriched.length; i++) {
      const similarIndices = this.findSimilarChunks(enriched[i].content, enriched);
      if (similarIndices.length > 0) {
        // Add cross-reference info (optional metadata)
        enriched[i].tags = [
          ...enriched[i].tags,
          ...similarIndices.map((idx) => `see-chunk-${idx}`).slice(0, 2),
        ].slice(0, 8);
      }
    }

    return enriched;
  }

  /**
   * Extract and enhance tags
   */
  private static enhanceTags(content: string, existingTags?: string[]): string[] {
    const tags = new Set<string>(existingTags || []);

    // Add action-oriented tags
    if (/\bhow\s+to\b|step|tutorial|guide|instruction/i.test(content)) {
      tags.add("how-to");
      tags.add("tutorial");
    }

    if (/\bcontact|phone|call|email|support|customer\s+service/i.test(content)) {
      tags.add("contact-info");
      tags.add("support");
    }

    if (/\brequiredmanual|must|required|mandatory|mandatory|shall\b/i.test(content)) {
      tags.add("requirement");
      tags.add("mandatory");
    }

    if (/\bdeadline|days?|within|by|until/i.test(content)) {
      tags.add("timeline");
      tags.add("deadline");
    }

    if (/\blaw|statute|regulation|nrs|nac|compliance|legal/i.test(content)) {
      tags.add("legal");
      tags.add("compliance");
    }

    if (/\bfaq|frequently|asked|question|q&a/i.test(content)) {
      tags.add("faq");
    }

    if (/\b(?:new|updated|revision|change|modify)/i.test(content)) {
      tags.add("news");
    }

    // Extract domain-specific terms (important nouns)
    const domainTerms = this.extractDomainTerms(content);
    domainTerms.slice(0, 3).forEach((t) => tags.add(t));

    // Return as array, max 8 tags
    return Array.from(tags).slice(0, 8);
  }

  /**
   * Determine topic classification
   */
  private static determineTopic(content: string, section: string): string {
    const combined = `${section} ${content}`.toLowerCase();

    const topicPatterns = {
      guide: /\b(?:how\s+to|guide|tutorial|step|instruction|process|begin|start|order)/i,
      faq: /\b(?:faq|frequently|asked|question|q&a|qa|answer|help)/i,
      policy: /\b(?:policy|procedure|requirement|rule|regulation|provision|standard|guideline)/i,
      contact: /\b(?:contact|phone|email|call|support|customer\s+service|address|assistance)/i,
      legal: /\b(?:legal|law|statute|regulation|nrs|nac|compliance|pursuant|under|authorized|agent)/i,
      product: /\b(?:product|service|feature|offering|tool|solution)/i,
      news: /\b(?:announcement|new|update|change|revision|notice|alert)/i,
      support: /\b(?:troubleshoot|problem|issue|fix|resolve|help|error)/i,
    };

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(combined)) {
        return topic;
      }
    }

    return "general";
  }

  /**
   * Improve section name for better clarity
   */
  private static improveSection(
    current: string,
    content: string,
    context?: string
  ): string {
    // If section is already descriptive, keep it
    if (current && current.length > 10 && current !== "General") {
      return current;
    }

    // Try to derive from content
    const firstLine = content.split("\n")[0];
    if (
      firstLine &&
      firstLine.length > 10 &&
      firstLine.length < 100 &&
      /^[A-Z]/.test(firstLine)
    ) {
      return firstLine;
    }

    // Try to derive from first paragraph's main concept
    const firstSentence = this.extractFirstSentence(content);
    if (firstSentence && firstSentence.length > 10) {
      // Extract the main subject (usually first 3 words)
      const words = firstSentence.split(/\s+/).slice(0, 4).join(" ");
      if (words.length > 6) return words;
    }

    // Fallback
    return current || "Content Section";
  }

  /**
   * Extract first sentence as preview
   */
  private static extractFirstSentence(text: string): string {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    if (!lines.length) return "";

    const firstLine = lines[0];
    const match = firstLine.match(/^([^.!?]+[.!?])/);
    if (match) {
      return match[1].slice(0, 160);
    }

    return firstLine.slice(0, 160);
  }

  /**
   * Extract domain-specific terms (important keywords)
   */
  private static extractDomainTerms(content: string, max = 4): string[] {
    // Common stopwords to exclude
    const stopwords = new Set([
      "the", "a", "an", "and", "or", "but", "is", "are", "be", "been",
      "have", "has", "had", "for", "from", "to", "of", "in", "on", "at",
      "by", "with", "without", "this", "that", "these", "those", "your",
      "you", "we", "they", "it", "as", "if", "or", "but", "not", "so",
    ]);

    // Extract noun-like terms (capitalized or technical words)
    const terms: string[] = [];
    const wordPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b|[a-z]+-[a-z]+\b/g;
    const matches = content.match(wordPattern) || [];

    for (const match of matches) {
      const term = match.toLowerCase();
      if (!stopwords.has(term) && term.length > 3) {
        terms.push(term);
      }
    }

    // Deduplicate and return
    return Array.from(new Set(terms)).slice(0, max);
  }

  /**
   * Find similar chunks (based on keyword overlap)
   */
  private static findSimilarChunks(
    content: string,
    allChunks: EnrichedChunk[],
    threshold = 0.6
  ): number[] {
    const keywords = new Set(
      content.match(/\b[a-z]{3,}\b/gi)?.map((w) => w.toLowerCase()) || []
    );

    if (keywords.size === 0) return [];

    const similarities: { index: number; score: number }[] = [];

    for (let i = 0; i < allChunks.length; i++) {
      const otherKeywords = new Set(
        allChunks[i].content.match(/\b[a-z]{3,}\b/gi)?.map((w) => w.toLowerCase()) || []
      );

      // Jaccard similarity
      const intersection = new Set(
        Array.from(keywords).filter((k) => otherKeywords.has(k))
      );
      const union = new Set([...keywords, ...otherKeywords]);
      const similarity = union.size > 0 ? intersection.size / union.size : 0;

      if (similarity >= threshold && similarity < 1) {
        similarities.push({ index: i, score: similarity });
      }
    }

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((s) => s.index);
  }

  /**
   * Validate enriched chunks for quality
   */
  static validateEnrichedChunks(chunks: EnrichedChunk[]): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const ch = chunks[i];

      if (!ch.content || ch.content.trim().length === 0) {
        issues.push(`Chunk ${i}: Empty content`);
      }

      if (ch.content.length < 20) {
        issues.push(`Chunk ${i}: Content too short (${ch.content.length} chars)`);
      }

      if (!ch.tags || ch.tags.length === 0) {
        issues.push(`Chunk ${i}: No tags`);
      }

      if (!ch.topic) {
        issues.push(`Chunk ${i}: No topic`);
      }

      if (!ch.section || ch.section.trim().length === 0) {
        issues.push(`Chunk ${i}: Empty section`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
