/**
 * Scalable RAG Microservice Bridge Client
 * Proxies multi-format document extraction and 3-tier chunking
 * to the standalone Scalable RAG Worker.
 *
 * Includes Smart Tag Extraction:
 * - AI chunks: Parses [Context: ...] prefixes into structured tags
 * - Adaptive chunks: Extracts tags from markdown headings, entities, and category-specific patterns
 */

export type EngineMode = "offline" | "hybrid" | "ai-full";
export type ChunkStrategy = "adaptive" | "ai";

export interface ScalableRagChunkNode {
  id: string;
  tier: "large" | "medium" | "small";
  chunkIndex: number;
  parentId: string | null;
  content: string;
  tokenCount: number;
  category: string;
}

export interface ScalableRagResult {
  ok: boolean;
  extraction: { engineMode: string; markdownLength: number };
  fullMarkdown?: string;
  classification: { category: string; confidence: number; reasoning: string };

  chunks: {
    large: ScalableRagChunkNode[];
    medium: ScalableRagChunkNode[];
    small: ScalableRagChunkNode[];
    all: ScalableRagChunkNode[];
  };
  counts: { large: number; medium: number; small: number; total: number };
}

// ─── Stop-word sets for filtering noise ──────────────────────────────

const STOP_ACRONYMS = new Set([
  "THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "CAN", "HER",
  "WAS", "ONE", "OUR", "OUT", "HAS", "HIS", "HOW", "ITS", "MAY", "NEW",
  "NOW", "OLD", "SEE", "WAY", "WHO", "DID", "GET", "HIM", "LET", "SAY",
  "SHE", "TOO", "USE",
]);

const STOP_NOUNS = new Set([
  "the", "and", "for", "this", "that", "with", "from", "have", "been",
  "will", "would", "could", "should", "which", "their", "there", "these",
  "those", "where", "about", "other", "after", "before", "between",
]);

// ─── Smart Tag Extraction Engine ─────────────────────────────────────

/**
 * Extract meaningful, search-optimized tags from chunk content.
 *
 * Strategy 1 (AI chunks): Parse [Context: ...] prefixes into structured tags
 * Strategy 2 (Adaptive chunks): Extract from markdown headings, entities,
 *   category-specific patterns, and distinctive noun phrases
 */
function extractSmartTags(
  content: string,
  category: string,
): { tags: string[]; cleanedContent: string; section: string } {
  const tags = new Set<string>();
  let cleanedContent = content;
  let section = "";

  // ── 1. Parse [Context: ...] prefix (AI chunker produces these) ─────

  const contextMatch = content.match(/^\[Context:\s*([^\]]+)\]\s*/);
  if (contextMatch) {
    const contextStr = contextMatch[1].trim();
    cleanedContent = content.slice(contextMatch[0].length).trim();

    // Use the full context string as the section label
    section = contextStr;

    // Split context by separators (/, -, |, >) into individual tag phrases
    const parts = contextStr
      .split(/\s*[\/\|>]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const part of parts) {
      const tag = toKebabTag(part);
      if (tag.length > 2) tags.add(tag);
    }
  }

  // ── 2. Extract markdown heading hierarchy → tags & section ─────────

  const headingLines: string[] = [];
  const headingRe = /^#{1,4}\s+(.+)$/gm;
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headingRe.exec(content)) !== null) {
    const heading = hMatch[1].replace(/[#*`]/g, "").trim();
    if (heading.length > 3 && heading.length < 100) {
      headingLines.push(heading);
      const tag = toKebabTag(heading);
      if (tag.length > 2) tags.add(tag);
    }
  }

  // If no [Context:] section was found, derive section from first heading
  if (!section && headingLines.length > 0) {
    section = headingLines[0];
  }

  // ── 3. Extract entity-like terms ───────────────────────────────────

  // Statute / regulation codes (NRS, NAC, CFR, USC, IRC, UCC, etc.)
  const statuteRe = /\b((?:NRS|NAC|CFR|USC|IRC|UCC|FAR|OSHA|ADA|HIPAA)\s*[\d.]+(?:\([^)]+\))?)/gi;
  let sMatch: RegExpExecArray | null;
  while ((sMatch = statuteRe.exec(content)) !== null) {
    tags.add(sMatch[1].toUpperCase().replace(/\s+/g, " ").trim());
  }

  // Standalone section-style numbers (e.g. "624.925", "§ 12.3")
  const sectionNumRe = /(?:§\s*)?(\d{2,}\.\d{2,}(?:\.\d+)?)/g;
  let snMatch: RegExpExecArray | null;
  while ((snMatch = sectionNumRe.exec(content)) !== null) {
    tags.add(snMatch[1]);
  }

  // Acronyms (2-6 uppercase letters, not stop words)
  const acronymRe = /\b([A-Z]{2,6})\b/g;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = acronymRe.exec(content)) !== null) {
    if (!STOP_ACRONYMS.has(aMatch[1])) {
      tags.add(aMatch[1]);
    }
  }

  // ── 3b. Extract Emails, Phone Numbers, and URLs via Regex ───────────

  // Emails
  const emailRe = /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
  let emMatch: RegExpExecArray | null;
  while ((emMatch = emailRe.exec(content)) !== null) {
    tags.add("contact-info");
    tags.add(`email:${emMatch[1].toLowerCase()}`);
  }

  // Phone Numbers
  const phoneRe = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  let phMatch: RegExpExecArray | null;
  while ((phMatch = phoneRe.exec(content)) !== null) {
    tags.add("contact-info");
    tags.add(`phone:${phMatch[0].replace(/[^\d]/g, "")}`);
  }

  // URLs & Domains
  const urlRe = /\b(?:https?:\/\/|www\.)([A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s<"']*)?)/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRe.exec(content)) !== null) {
    tags.add("web-link");
    tags.add(`url:${urlMatch[1].toLowerCase().slice(0, 35)}`);
  }


  // ── 4. Category-specific extraction ────────────────────────────────

  switch (category) {
    case "Legal_Regulatory":
      if (/\b(?:shall|must|required|mandatory|obligated)\b/i.test(content)) tags.add("requirement");
      if (/\b(?:penalty|fine|violation|sanction|infraction)\b/i.test(content)) tags.add("penalty");
      if (/\b(?:licens(?:e|ing)|permit|certification|registration)\b/i.test(content)) tags.add("licensing");
      if (/\b(?:deadline|within\s+\d+\s+days?|time\s*(?:limit|frame|period))\b/i.test(content)) tags.add("deadline");
      if (/\b(?:appeal|hearing|review|complaint|grievance)\b/i.test(content)) tags.add("appeals-process");
      if (/\b(?:exempt(?:ion)?|waiver|exclusion)\b/i.test(content)) tags.add("exemption");
      if (/\b(?:prohibit|forbidden|unlawful|illegal)\b/i.test(content)) tags.add("prohibition");
      break;

    case "Code_Technical":
      if (/\b(?:api|endpoint|route|request|response|REST|GraphQL)\b/i.test(content)) tags.add("api");
      if (/\b(?:install|setup|configure|deploy|build)\b/i.test(content)) tags.add("setup");
      if (/\b(?:error|bug|fix|debug|troubleshoot|issue)\b/i.test(content)) tags.add("troubleshooting");
      if (/\b(?:security|auth|token|encrypt|permission)\b/i.test(content)) tags.add("security");
      // Extract function/class names from code
      const funcRe = /(?:function|class|interface|type|const|let|var|def|fn)\s+([A-Za-z_]\w{2,30})/g;
      let fMatch: RegExpExecArray | null;
      while ((fMatch = funcRe.exec(content)) !== null) {
        const name = fMatch[1].toLowerCase();
        if (name.length > 3 && !STOP_NOUNS.has(name)) tags.add(name);
      }
      break;

    case "FAQ_Knowledgebase":
      if (/\b(?:how\s+(?:to|do|can)|step[- ]by[- ]step)\b/i.test(content)) tags.add("how-to");
      if (/\b(?:contact|phone|email|support|help\s*desk)\b/i.test(content)) tags.add("contact-info");
      if (/\b(?:frequently|common\s+question|faq)\b/i.test(content)) tags.add("faq");
      if (/\?\s*$/m.test(content)) tags.add("question");
      break;

    case "Financial_Tabular":
      if (/\b(?:total|sum|balance|amount|price|cost|fee|rate)\b/i.test(content)) tags.add("financial-data");
      if (/\|.*\|/m.test(content)) tags.add("tabular-data");
      if (/\b(?:revenue|profit|loss|income|expense|budget)\b/i.test(content)) tags.add("financial-metrics");
      break;

    case "Medical_Scientific":
      if (/\b(?:patient|diagnosis|treatment|symptom|clinical|therapy)\b/i.test(content)) tags.add("clinical");
      if (/\b(?:study|research|trial|findings|results|methodology)\b/i.test(content)) tags.add("research");
      if (/\b(?:dosage|drug|medication|prescription|pharma)\b/i.test(content)) tags.add("pharmaceutical");
      break;

    case "Form_KeyValue":
      if (/\b(?:name|address|phone|email|date|signature)\b/i.test(content)) tags.add("form-fields");
      if (/\b(?:applicant|submit|application|registration)\b/i.test(content)) tags.add("application");
      break;
  }

  // ── 5. Universal action-oriented tags ──────────────────────────────

  if (/\b(?:definition|means|defined\s+as|refers\s+to|is\s+known\s+as)\b/i.test(content)) tags.add("definition");
  if (/\b(?:example|e\.g\.|for\s+instance|such\s+as|illustrated)\b/i.test(content)) tags.add("example");
  if (/\b(?:exception|except|unless|provided\s+that|notwithstanding)\b/i.test(content)) tags.add("exception");
  if (/\b(?:important|note|warning|caution|attention|critical)\b/i.test(content)) tags.add("important-note");
  if (/\b(?:procedure|process|workflow|steps?\s+\d)\b/i.test(content)) tags.add("procedure");
  if (/\b(?:eligib(?:le|ility)|qualif(?:y|ied|ication))\b/i.test(content)) tags.add("eligibility");

  // ── 6. Extract distinctive noun phrases (Capitalized Multi-Word) ───

  const nounPhraseRe = /\b([A-Z][a-z]{2,}(?:\s+(?:and\s+)?[A-Z][a-z]{2,}){1,4})\b/g;
  const nounPhrases: string[] = [];
  let npMatch: RegExpExecArray | null;
  while ((npMatch = nounPhraseRe.exec(content)) !== null) {
    const phrase = npMatch[1];
    // Skip common false positives (sentence starts)
    if (phrase.length > 6 && phrase.length < 50) {
      nounPhrases.push(phrase);
    }
  }

  // Deduplicate and add top 3 noun phrases as tags
  const uniqueNounPhrases = Array.from(new Set(nounPhrases.map((np) => toKebabTag(np))));
  for (let i = 0; i < Math.min(3, uniqueNounPhrases.length); i++) {
    if (uniqueNounPhrases[i].length > 3) tags.add(uniqueNounPhrases[i]);
  }

  // ── 7. Always add the classification category as a base tag ────────

  tags.add(category.toLowerCase().replace(/_/g, "-"));

  // ── Return: max 8 tags, cleaned content, derived section ───────────

  return {
    tags: Array.from(tags).filter((t) => t.length > 1).slice(0, 8),
    cleanedContent,
    section: section || "Content Section",
  };
}

/**
 * Convert a free-text phrase into a clean kebab-case tag.
 * "Licensing Requirements for Pool Contractors" → "licensing-requirements-for-pool-contractors"
 */
function toKebabTag(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

// ─── Main Client Class ──────────────────────────────────────────────

export class ScalableRagClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || "http://127.0.0.1:8788").replace(/\/$/, "");
  }

  /**
   * Process a document synchronously through the scalable rag pipeline.
   * Returns 3-tier hierarchical chunks.
   */
  async processDocument(
    file: File | Blob,
    engineMode: EngineMode = "offline",
    strategy: ChunkStrategy = "adaptive",
    pageImages?: string,
    fileName: string = "document.txt"
  ): Promise<ScalableRagResult> {
    const formData = new FormData();
    if (file instanceof Blob && typeof (file as any).name !== "string") {
      formData.append("file", file, fileName);
    } else {
      formData.append("file", file);
    }
    formData.append("engineMode", engineMode);
    formData.append("strategy", strategy);
    if (pageImages) {
      formData.append("pageImages", pageImages);
    }

    const res = await fetch(`${this.baseUrl}/api/documents/process-sync`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      const msg = (errBody as any).error || (errBody as any).details || res.statusText;
      throw new Error(msg);
    }

    return res.json() as Promise<ScalableRagResult>;
  }

  /**
   * Convert ScalableRag 3-tier chunks to fervent-curie's flat chunk format.
   *
   * For each chunk:
   * - AI chunks: Parses [Context: ...] prefix → structured tags + clean content
   * - Adaptive chunks: Extracts tags from headings, entities, category patterns
   * - Both: Enriched with search-optimized metadata tags for RAG retrieval
   */
  static toFerventCurieChunks(
    result: ScalableRagResult
  ): Array<{
    index: number;
    content: string;
    section: string;
    tags: string[];
    topic: string;
    tier: string;
    parentId: string | null;
    tokenCount: number;
  }> {
    const category = result.classification?.category || "Prose_Standard";
    const out: any[] = [];
    let idx = 0;

    for (const node of result.chunks.all) {
      // Extract smart tags + clean content (handles both AI and adaptive chunks)
      const { tags, cleanedContent, section: derivedSection } = extractSmartTags(
        node.content,
        category,
      );

      // Build section label: use derived section (from [Context:] or heading) + tier indicator
      const tierEmoji =
        node.tier === "large" ? "📄" :
        node.tier === "medium" ? "📝" :
        "🔍";
      const section = derivedSection !== "Content Section"
        ? `${tierEmoji} ${derivedSection}`
        : `${tierEmoji} ${node.tier.charAt(0).toUpperCase() + node.tier.slice(1)} Chunk`;

      out.push({
        index: idx++,
        content: cleanedContent,
        section,
        tags,
        topic: category.replace(/_/g, " "),
        tier: node.tier,
        parentId: node.parentId,
        tokenCount: node.tokenCount,
      });
    }

    return out;
  }
}
