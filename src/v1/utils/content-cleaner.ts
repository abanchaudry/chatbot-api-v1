/**
 * Content Cleaner Utility
 * Removes UI artifacts, formatting clutter, and normalizes content before chunking
 * Preserves actual content while removing navigation, buttons, and repetitive elements
 */

interface CleaningOptions {
  removeUrls?: boolean;
  removeEmails?: boolean;
  removePhoneNumbers?: boolean;
  removeUIArtifacts?: boolean;
  normalizeWhitespace?: boolean;
  extractMetadata?: boolean;
}

interface ExtractedMetadata {
  phoneNumbers: string[];
  emails: string[];
  urls: string[];
  importantDates: string[];
}

export class ContentCleaner {
  /**
   * Clean content by removing UI artifacts and normalizing
   */
  static cleanContent(
    text: string,
    options: CleaningOptions = {}
  ): { cleaned: string; metadata: ExtractedMetadata } {
    const {
      removeUrls = false,
      removeEmails = false,
      removePhoneNumbers = false,
      removeUIArtifacts = true,
      normalizeWhitespace = true,
      extractMetadata = true,
    } = options;

    let cleaned = text;
    const metadata: ExtractedMetadata = {
      phoneNumbers: [],
      emails: [],
      urls: [],
      importantDates: [],
    };

    // Extract metadata before removing
    if (extractMetadata) {
      metadata.phoneNumbers = this.extractPhoneNumbers(cleaned);
      metadata.emails = this.extractEmails(cleaned);
      metadata.urls = this.extractUrls(cleaned);
      metadata.importantDates = this.extractDates(cleaned);
    }

    // Remove UI artifacts (×, buttons, navigation)
    if (removeUIArtifacts) {
      cleaned = this.removeUIArtifacts(cleaned);
    }

    // Remove URLs if requested
    if (removeUrls) {
      cleaned = cleaned.replace(
        /https?:\/\/[^\s)]+|www\.[^\s)]+/gi,
        "[URL]"
      );
    }

    // Remove emails if requested
    if (removeEmails) {
      cleaned = cleaned.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        "[EMAIL]"
      );
    }

    // Remove phone numbers if requested (but keep as reference)
    if (removePhoneNumbers) {
      cleaned = cleaned.replace(
        /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
        "[PHONE]"
      );
    }

    // Normalize whitespace
    if (normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    return { cleaned, metadata };
  }

  /**
   * Remove common UI artifacts, buttons, and navigation clutter
   * CONSERVATIVE: Only remove obvious extraction artifacts, preserve ALL real content including metadata
   */
  private static removeUIArtifacts(text: string): string {
    let cleaned = text;

    // PRESERVE:
    // - Source URL, Page Title, Main Heading (metadata from extraction)
    // - All contact information
    // - All actual content lines

    // ONLY REMOVE:
    // 1. HTML extraction artifacts (broken quotes, link markers)
    cleaned = cleaned.replace(/"\s+to\s+new\s+browser\s+window\s+with\s+\w+/gi, "");
    cleaned = cleaned.replace(/"\s*$/gm, ""); // Trailing broken quotes

    // 2. Link metadata markers
    cleaned = cleaned.replace(/:\s+link\s*$/gm, "");
    cleaned = cleaned.replace(/\|\s+link\s*$/gm, "");
    cleaned = cleaned.replace(/\s+link\s*$/gm, "");

    // 3. Visual separators with no semantic meaning
    cleaned = cleaned.replace(/\s*×\s*/g, " ");
    cleaned = cleaned.replace(/(\s*[|•·]\s*){4,}/g, " | ");

    // 4. Only standalone UI words in isolation (not part of real phrases)
    cleaned = cleaned.replace(/^\s*Drag\s+&\s+Drop\s*$/gim, "");
    cleaned = cleaned.replace(/^\s*menu\s*$/gim, "");
    cleaned = cleaned.replace(/^\s*breadcrumb\s*$/gim, "");

    // DO NOT REMOVE:
    // - "Source URL", "Page Title", "Main Heading" (metadata)
    // - "Contact", "Las Vegas Office", "Phone", "Email", "Address" (real content)
    // - Links/buttons that are actual content (e.g., "Request Documents" button is real)

    return cleaned;
  }

  /**
   * Normalize whitespace while preserving paragraph structure
   */
  private static normalizeWhitespace(text: string): string {
    let cleaned = text;

    // Convert CRLF to LF
    cleaned = cleaned.replace(/\r\n/g, "\n");

    // Remove trailing whitespace from lines
    cleaned = cleaned.replace(/[ \t]+$/gm, "");

    // Replace multiple spaces with single space
    cleaned = cleaned.replace(/[ \t]+/g, " ");

    // Replace 4+ newlines with 2 newlines (preserve paragraph breaks)
    cleaned = cleaned.replace(/\n{4,}/g, "\n\n");

    // Remove newline after space before text
    cleaned = cleaned.replace(/\n\s+/g, "\n");

    return cleaned.trim();
  }

  /**
   * Extract phone numbers from text
   */
  private static extractPhoneNumbers(text: string): string[] {
    const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    const matches = text.match(phoneRegex) || [];
    return [...new Set(matches.map((p) => p.trim()))];
  }

  /**
   * Extract email addresses from text
   */
  private static extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    return [...new Set(matches)];
  }

  /**
   * Extract URLs from text
   */
  private static extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s)]+|www\.[^\s)]+/gi;
    const matches = text.match(urlRegex) || [];
    return [...new Set(matches.map((u) => u.trim()))];
  }

  /**
   * Extract important dates/deadlines
   */
  private static extractDates(text: string): string[] {
    const datePatterns = [
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g,
      /\b(?:within|in|by|before|after|until)\s+(\d+)\s+(?:day|week|month|year)s?\b/gi,
    ];

    const dates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = text.match(pattern) || [];
      dates.push(...matches);
    }

    return [...new Set(dates)];
  }

  /**
   * Extract and highlight important sections (deadlines, requirements, etc.)
   */
  static extractImportantSections(text: string): string[] {
    const patterns = [
      /(?:IMPORTANT|NOTE|ATTENTION|WARNING|CRITICAL|DEADLINE)[\s:]+[^\n]+/gi,
      /(?:PURSUANT\s+TO|ACCORDING\s+TO|UNDER)\s+[A-Z\s0-9.]+:\s*[^\n.]+[.!?]/gi,
      /\b(?:MUST|REQUIRED|MANDATORY|SHALL|MUST NOT)\b[^\n.]*[.!?]/gi,
    ];

    const sections: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      sections.push(...matches);
    }

    return sections.map((s) => s.trim()).filter(Boolean);
  }

  /**
   * Get a summary of content quality/issues
   */
  static analyzeContentQuality(
    original: string,
    cleaned: string
  ): {
    artifactsRemoved: number;
    compressionRatio: number;
    hasMetadata: boolean;
  } {
    const originalLen = original.length;
    const cleanedLen = cleaned.length;
    const compressed = 1 - cleanedLen / originalLen;

    // Count artifacts removed (rough estimate)
    const artifactPatterns = [
      /[×✓✕]/g,
      /click\s+(?:here|for)/gi,
      /link\s+to/gi,
    ];
    let artifactCount = 0;
    for (const pattern of artifactPatterns) {
      const matches = original.match(pattern) || [];
      artifactCount += matches.length;
    }

    return {
      artifactsRemoved: artifactCount,
      compressionRatio: Number((compressed * 100).toFixed(2)),
      hasMetadata: /(phone|email|url|date)/i.test(original),
    };
  }
}
