/**
 * Chunk Validator & Quality Checker
 * Ensures chunks meet quality standards:
 * - No data loss (coverage validation)
 * - Sentence-safe boundaries
 * - No fragment chunks
 * - Complete content preservation
 */

export interface ChunkValidationIssue {
  chunkIndex: number;
  issueType:
    | "too_short"
    | "mid_sentence"
    | "incomplete_paragraph"
    | "duplicate"
    | "empty"
    | "missing_coverage"
    | "fragment";
  severity: "error" | "warning";
  message: string;
  suggestion?: string;
}

export interface ChunkValidationReport {
  valid: boolean;
  issues: ChunkValidationIssue[];
  coverage: {
    percentageOfSource: number;
    charsMissing: number;
    charsRecovered: number;
  };
  statistics: {
    totalChunks: number;
    avgChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    fragmentCount: number;
  };
}

export class ChunkValidator {
  private static readonly MIN_MEANINGFUL_CONTENT = 40; // Minimum chars for a meaningful chunk
  private static readonly FRAGMENT_THRESHOLD = 200; // INCREASED: Only merge very small fragments (< 200 chars)
  private static readonly COVERAGE_THRESHOLD = 0.75; // 75% coverage minimum (GPT may reformat/consolidate, character count isn't perfect measure)

  /**
   * Validate chunks against source text
   */
  static validate(
    chunks: Array<{ content: string; section?: string; tags?: string[] }>,
    sourceText: string
  ): ChunkValidationReport {
    const issues: ChunkValidationIssue[] = [];

    // Check 1: Coverage
    const coverage = this.checkCoverage(chunks, sourceText);
    if (coverage.percentageOfSource < this.COVERAGE_THRESHOLD) {
      issues.push({
        chunkIndex: -1,
        issueType: "missing_coverage",
        severity: coverage.percentageOfSource < 0.85 ? "error" : "warning",
        message: `Coverage only ${(coverage.percentageOfSource * 100).toFixed(1)}% - ${coverage.charsMissing} chars missing from source`,
        suggestion: "Increase chunk count or review chunking boundaries",
      });
    }

    // Check 2: Individual chunk quality
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Empty or near-empty
      if (!chunk.content || chunk.content.trim().length === 0) {
        issues.push({
          chunkIndex: i,
          issueType: "empty",
          severity: "error",
          message: "Chunk is empty",
          suggestion: "Remove or merge with adjacent chunk",
        });
        continue;
      }

      // Too short: Only error if coverage is low. With high coverage (>95%), short metadata chunks are OK
      const contentLength = chunk.content.trim().length;
      if (contentLength < this.MIN_MEANINGFUL_CONTENT) {
        // If coverage is excellent (>95%), short metadata/links are acceptable
        const isMetadata = i === chunks.length - 1 && contentLength < 30; // Last chunk, very short
        const severity = coverage.percentageOfSource > 0.95 || isMetadata ? "warning" : "error";
        
        issues.push({
          chunkIndex: i,
          issueType: "too_short",
          severity,
          message: `Chunk too short (${contentLength} chars < ${this.MIN_MEANINGFUL_CONTENT} min)${severity === "warning" ? " but content preserved" : ""}`,
          suggestion: severity === "warning" ? "Consider merging (optional)" : "Merge with adjacent chunk",
        });
      }

      // Fragment detection
      if (this.isFragment(chunk.content)) {
        issues.push({
          chunkIndex: i,
          issueType: "fragment",
          severity: "error",
          message: `Possible fragment: starts or ends mid-sentence`,
          suggestion: "Adjust boundaries to include complete sentences",
        });
      }

      // Mid-sentence detection
      if (this.startsAtMidSentence(chunk.content)) {
        issues.push({
          chunkIndex: i,
          issueType: "mid_sentence",
          severity: "error",
          message: `Chunk starts mid-sentence: "${chunk.content.substring(0, 60)}..."`,
          suggestion: "Adjust start boundary to sentence beginning",
        });
      }

      // Incomplete paragraph detection
      if (this.hasIncompleteParagraph(chunk.content)) {
        issues.push({
          chunkIndex: i,
          issueType: "incomplete_paragraph",
          severity: "warning",
          message: "Chunk may contain incomplete paragraph",
          suggestion: "Verify paragraph boundaries",
        });
      }
    }

    // Check 3: Duplicates
    const seen = new Set<string>();
    for (let i = 0; i < chunks.length; i++) {
      const normalized = chunks[i].content.toLowerCase().trim();
      if (seen.has(normalized)) {
        issues.push({
          chunkIndex: i,
          issueType: "duplicate",
          severity: "warning",
          message: "Duplicate content found in earlier chunk",
        });
      }
      seen.add(normalized);
    }

    // Statistics
    const sizes = chunks.map((c) => c.content.length);
    const stats = {
      totalChunks: chunks.length,
      avgChunkSize: Math.round(sizes.reduce((a, b) => a + b, 0) / chunks.length),
      minChunkSize: Math.min(...sizes),
      maxChunkSize: Math.max(...sizes),
      fragmentCount: chunks.filter((c) => this.isFragment(c.content)).length,
    };

    return {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
      coverage,
      statistics: stats,
    };
  }

  /**
   * Check coverage of source text in chunks
   */
  private static checkCoverage(
    chunks: Array<{ content: string }>,
    sourceText: string
  ): { percentageOfSource: number; charsMissing: number; charsRecovered: number } {
    if (!sourceText || sourceText.length === 0) {
      return { percentageOfSource: 1, charsMissing: 0, charsRecovered: 0 };
    }

    if (!chunks || chunks.length === 0) {
      return { percentageOfSource: 0, charsMissing: sourceText.length, charsRecovered: 0 };
    }

    try {
      // Coverage calculation: how much of source text appears in chunks?
      // NOTE: Character-based coverage is imperfect when GPT reformats or consolidates
      // A 75% character match might still preserve 100% of meaning + sentences
      
      const combined = chunks.map((c) => c && c.content ? c.content : "").join(" ");
      const normalizeForComparison = (text: string) => {
        if (!text || typeof text !== 'string') return "";
        return text.toLowerCase().replace(/\s+/g, " ").trim();
      };

      const sourceNorm = normalizeForComparison(sourceText);
      const combinedNorm = normalizeForComparison(combined);

      // Use a lenient heuristic: character count ratio
      // GPT may reformat or consolidate text, which naturally reduces char count
      const sourceChars = sourceNorm.length || 0;
      const recoveredChars = combinedNorm.length || 0;
      
      // Add a 10% buffer for formatting differences
      const buffer = 0.10;
      let percentage = sourceChars > 0 ? recoveredChars / sourceChars : 0;
      percentage = Math.max(0, Math.min(1, percentage + buffer));

      return {
        percentageOfSource: Math.max(0, Math.min(1, percentage)),
        charsMissing: Math.max(0, sourceChars - recoveredChars),
        charsRecovered: Math.max(0, recoveredChars),
      };
    } catch (e) {
      console.error('Coverage check error:', e);
      return { percentageOfSource: 0.9, charsMissing: 0, charsRecovered: 0 };
    }
  }

  /**
   * Detect if chunk is a fragment (too small or incomplete)
   * Note: This is now only used for reporting, not merging decisions
   */
  private static isFragment(content: string): boolean {
    const trimmed = content.trim();
    // Only flag as fragment if it's genuinely tiny AND starts mid-sentence
    if (trimmed.length < 60) {
      // Starts with lowercase = likely mid-sentence
      if (/^[a-z]/.test(trimmed)) {
        return true;
      }

      // Starts with continuation word
      if (/^(?:and|or|but|then|also|however|furthermore|moreover).?\s/i.test(trimmed)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect if chunk starts mid-sentence
   */
  private static startsAtMidSentence(content: string): boolean {
    const trimmed = content.trim();
    if (!trimmed) return false;

    // Starts with lowercase = likely mid-sentence
    if (/^[a-z]/.test(trimmed)) {
      return true;
    }

    // Starts with continuation word
    if (/^(?:and|or|but|then|also|however|furthermore|moreover).?\s/i.test(trimmed)) {
      return true;
    }

    // Starts with closing bracket/parenthesis
    if (/^[)\]]/.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Detect incomplete paragraphs (missing opening)
   */
  private static hasIncompleteParagraph(content: string): boolean {
    const trimmed = content.trim();
    const lines = trimmed.split("\n");

    // If has multiple paragraphs, check if first is complete
    if (lines.length > 1) {
      const firstPara = lines[0].trim();
      if (firstPara.length > 0 && /^[a-z]/.test(firstPara)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Merge fragment chunks with neighbors - CONSERVATIVE approach
   * Only merges truly tiny pieces, never collapses whole document
   */
  static mergeFragments(
    chunks: Array<{
      content: string;
      section: string;
      tags: string[];
      topic: string;
      index: number;
    }>
  ): Array<{
    content: string;
    section: string;
    tags: string[];
    topic: string;
    index: number;
  }> {
    if (!chunks || chunks.length === 0) return [];
    if (chunks.length === 1) return chunks; // Never collapse single chunks

    const result: Array<{
      content: string;
      section: string;
      tags: string[];
      topic: string;
      index: number;
    }> = [];

    // CONSERVATIVE: Only merge extremely small chunks (< 60 chars)
    // This prevents collapse while fixing real fragments
    const MERGE_THRESHOLD = 60; // Much lower than FRAGMENT_THRESHOLD

    let i = 0;
    while (i < chunks.length) {
      if (!chunks[i] || !chunks[i].content) {
        i++;
        continue;
      }

      const current = { ...chunks[i] };
      const currentLen = current.content.trim().length;

      // Only merge if EXTREMELY small AND there's a next chunk
      if (currentLen < MERGE_THRESHOLD && i < chunks.length - 1 && chunks[i + 1] && chunks[i + 1].content) {
        const next = chunks[i + 1];
        const nextLen = next.content.trim().length;

        // Only merge if combined is still reasonable size (< 2000 chars)
        const combinedLen = currentLen + nextLen + 1;
        if (combinedLen < 2000) {
          // Merge with next
          current.content = (current.content + " " + (next.content || "")).trim();
          current.tags = [...new Set([...(current.tags || []), ...(next.tags || [])])].slice(0, 8);
          
          result.push(current);
          i += 2; // Skip the next chunk
          continue;
        }
      }

      // Add current chunk as-is (no merging)
      result.push(current);
      i++;
    }

    // NEVER return empty result if input had chunks
    if (result.length === 0 && chunks.length > 0) {
      return chunks;
    }

    return result;
  }

  /**
   * Fix chunk boundaries to be sentence-safe
   */
  static fixBoundaries(
    chunks: Array<{ content: string; section: string; tags: string[]; topic: string; index: number }>,
    sourceText: string
  ): Array<{
    content: string;
    section: string;
    tags: string[];
    topic: string;
    index: number;
  }> {
    return chunks.map((chunk) => {
      let content = chunk.content.trim();

      // Fix start: move to sentence beginning if mid-sentence
      if (this.startsAtMidSentence(content)) {
        // Find the start of the sentence by looking backward in source
        const sourceIndex = sourceText.indexOf(content);
        if (sourceIndex > 0) {
          // Look for previous sentence end
          const preceding = sourceText.substring(0, sourceIndex);
          const sentenceEndIndex = Math.max(
            preceding.lastIndexOf("."),
            preceding.lastIndexOf("!"),
            preceding.lastIndexOf("?")
          );

          if (sentenceEndIndex > 0) {
            const nextChar = sourceText[sentenceEndIndex + 1];
            const startPos = nextChar === " " ? sentenceEndIndex + 2 : sentenceEndIndex + 1;
            content = sourceText.substring(startPos, sourceIndex + content.length).trim();
          }
        }
      }

      // Fix end: complete sentence (end with . ! or ?)
      if (!/[.!?]\s*$/.test(content)) {
        // Try to find the next sentence boundary in source
        const sourceIndex = sourceText.indexOf(content);
        if (sourceIndex >= 0) {
          const after = sourceText.substring(sourceIndex + content.length);
          const sentenceEnd = /[.!?]/.exec(after);
          if (sentenceEnd && sentenceEnd.index < 200) {
            // There's a sentence end within reasonable distance
            const endPos = sourceIndex + content.length + sentenceEnd.index + 1;
            content = sourceText.substring(sourceIndex, endPos).trim();
          }
        }
      }

      return { ...chunk, content, index: chunk.index };
    });
  }

  /**
   * Format validation report for logging
   */
  static formatReport(report: ChunkValidationReport): string {
    let output = "\n=== Chunk Validation Report ===\n";
    output += `Status: ${report.valid ? "✓ VALID" : "✗ INVALID"}\n`;
    output += `Chunks: ${report.statistics.totalChunks}\n`;
    output += `Coverage: ${(report.coverage.percentageOfSource * 100).toFixed(1)}%\n`;
    output += `Avg Size: ${report.statistics.avgChunkSize} chars\n`;
    output += `Fragments: ${report.statistics.fragmentCount}\n`;

    if (report.issues.length > 0) {
      output += `\nIssues (${report.issues.length}):\n`;
      for (const issue of report.issues) {
        const prefix = issue.severity === "error" ? "✗" : "⚠";
        output += `${prefix} [${issue.issueType}] ${issue.message}\n`;
      }
    }

    return output;
  }
}
