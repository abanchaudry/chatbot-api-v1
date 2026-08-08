/**
 * Metadata Extractor
 * Extracts structured information from chunks (phone numbers, dates, regulations, etc.)
 * Enriches chunks with actionable metadata
 */

export interface ChunkMetadata {
  phoneNumbers?: string[];
  urls?: string[];
  emails?: string[];
  regulations?: string[];
  deadlineDays?: number;
  importance?: "critical" | "important" | "normal";
  type?: "guide" | "faq" | "policy" | "contact" | "legal" | "general";
  keyTerms?: string[];
  extractedAt?: string;
}

export class MetadataExtractor {
  /**
   * Extract all metadata from a chunk
   */
  static extractMetadata(content: string): ChunkMetadata {
    const metadata: ChunkMetadata = {
      extractedAt: new Date().toISOString(),
    };

    metadata.phoneNumbers = this.extractPhoneNumbers(content);
    metadata.urls = this.extractUrls(content);
    metadata.emails = this.extractEmails(content);
    metadata.regulations = this.extractRegulations(content);
    metadata.deadlineDays = this.extractDeadline(content);
    metadata.importance = this.determineImportance(content);
    metadata.type = this.determineType(content);
    metadata.keyTerms = this.extractKeyTerms(content);

    return metadata;
  }

  /**
   * Extract phone numbers
   */
  private static extractPhoneNumbers(text: string): string[] {
    const patterns = [
      /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      /\b(?:call|phone|Tel|Phone)\s+(?:us\s+)?(?:at\s+)?[+]?[\d\s\-().]{10,}\b/gi,
    ];

    const numbers: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      numbers.push(...matches.map((m) => m.trim()));
    }

    return [...new Set(numbers)];
  }

  /**
   * Extract URLs
   */
  private static extractUrls(text: string): string[] {
    const pattern = /https?:\/\/[^\s)]+|www\.[^\s)]+/gi;
    const matches = text.match(pattern) || [];
    return [...new Set(matches.map((u) => u.trim()))];
  }

  /**
   * Extract emails
   */
  private static extractEmails(text: string): string[] {
    const pattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(pattern) || [];
    return [...new Set(matches)];
  }

  /**
   * Extract regulation/compliance codes (NRS, NAC, CFR, etc.)
   */
  private static extractRegulations(text: string): string[] {
    const patterns = [
      /\b(?:NRS|NAC|CFR|USC|RSA|HB|SB|AB|OSHA)\s+[\d.]+(?:\s*\([^)]+\))?/gi,
      /\b(?:Nevada|Federal|State)\s+(?:Regulation|Statute|Law|Ordinance)\s+[A-Z0-9.]+/gi,
      /(?:pursuant|according|under|reference)\s+(?:to\s+)*[A-Z]+\s+[\d.]+/gi,
    ];

    const regulations: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      regulations.push(...matches.map((m) => m.toUpperCase().trim()));
    }

    return [...new Set(regulations)];
  }

  /**
   * Extract deadline (if specified as "X days")
   */
  private static extractDeadline(text: string): number | undefined {
    const patterns = [
      /(\d+)\s+(?:calendar\s+)?days?\b/i,
      /within\s+(\d+)\s+(?:calendar\s+)?days?\b/i,
      /(?:\d+ )?(?:business\s+)?(?:days?|hours?|weeks?)\s+(?:to|for)\s+(?:provide|deliver|respond|complete)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return Number(match[1]);
      }
    }

    return undefined;
  }

  /**
   * Determine importance level based on keywords
   */
  private static determineImportance(
    text: string
  ): "critical" | "important" | "normal" {
    const critical = /\b(?:CRITICAL|MUST|REQUIRED|MANDATORY|DEADLINE|URGENT|PENALTY|VIOLATION)\b/i;
    const important = /\b(?:IMPORTANT|ATTENTION|WARNING|NOTE|REQUIRED|SHALL|MUST NOT)\b/i;

    if (critical.test(text)) return "critical";
    if (important.test(text)) return "important";
    return "normal";
  }

  /**
   * Determine content type
   */
  private static determineType(
    text: string
  ): "guide" | "faq" | "policy" | "contact" | "legal" | "general" {
    const typePatterns = {
      guide: /\b(?:how\s+to|guide|tutorial|step|instruction|process|procedure)\b/i,
      faq: /\b(?:faq|frequently|asked|question|q&a|qa)\b/i,
      policy: /\b(?:policy|procedure|requirement|rule|regulation|provision)\b/i,
      contact: /\b(?:contact|call|phone|email|address|customer\s+service)\b/i,
      legal: /\b(?:legal|law|statute|regulation|nrs|compliance|pursuant)\b/i,
    };

    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(text)) {
        return type as keyof typeof typePatterns;
      }
    }

    return "general";
  }

  /**
   * Extract key terms/entities from content
   */
  private static extractKeyTerms(text: string, max = 6): string[] {
    // Common stopwords
    const stopwords = new Set([
      "the", "a", "an", "and", "or", "but", "is", "are", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
      "may", "might", "must", "can", "for", "from", "to", "as", "of", "in", "on",
      "at", "by", "with", "without", "under", "over", "about", "which", "that",
      "this", "these", "those", "your", "you", "we", "they", "them", "it", "its",
    ]);

    // Extract words
    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 3 &&
          !stopwords.has(w) &&
          !/^\d+$/.test(w)
      );

    // Count frequency
    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }

    // Sort by frequency
    const sorted = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([term]) => term);

    return sorted;
  }

  /**
   * Merge metadata from multiple chunks (for summary)
   */
  static mergeMetadata(...metadataList: ChunkMetadata[]): ChunkMetadata {
    const merged: ChunkMetadata = {
      extractedAt: new Date().toISOString(),
    };

    const phoneNumbers = new Set<string>();
    const urls = new Set<string>();
    const emails = new Set<string>();
    const regulations = new Set<string>();
    const keyTerms = new Set<string>();

    for (const m of metadataList) {
      m.phoneNumbers?.forEach((p) => phoneNumbers.add(p));
      m.urls?.forEach((u) => urls.add(u));
      m.emails?.forEach((e) => emails.add(e));
      m.regulations?.forEach((r) => regulations.add(r));
      m.keyTerms?.forEach((k) => keyTerms.add(k));
    }

    if (phoneNumbers.size > 0) merged.phoneNumbers = Array.from(phoneNumbers);
    if (urls.size > 0) merged.urls = Array.from(urls);
    if (emails.size > 0) merged.emails = Array.from(emails);
    if (regulations.size > 0) merged.regulations = Array.from(regulations);
    if (keyTerms.size > 0) merged.keyTerms = Array.from(keyTerms).slice(0, 8);

    // Determine overall importance (critical > important > normal)
    const importances = metadataList
      .map((m) => m.importance || "normal")
      .sort((a, b) => {
        const order = { critical: 3, important: 2, normal: 1 };
        return (order[b] ?? 0) - (order[a] ?? 0);
      });

    merged.importance = (importances[0] as any) || "normal";

    return merged;
  }
}
