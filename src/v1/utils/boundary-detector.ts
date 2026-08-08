/**
 * Boundary Detector
 * Detects logical chunk boundaries:
 * - Sentence endings
 * - Paragraph breaks
 * - Section headers
 * - List items
 * - Helps ensure chunks don't split mid-sentence
 */

export interface Boundary {
  position: number;
  type: "sentence" | "paragraph" | "section" | "list_item";
  confidence: number;
}

export class BoundaryDetector {
  /**
   * Find all logical boundaries in text
   */
  static findBoundaries(text: string): Boundary[] {
    const boundaries: Boundary[] = [];

    // Find sentence boundaries
    boundaries.push(...this.findSentenceBoundaries(text));

    // Find paragraph boundaries
    boundaries.push(...this.findParagraphBoundaries(text));

    // Find section boundaries
    boundaries.push(...this.findSectionBoundaries(text));

    // Find list item boundaries
    boundaries.push(...this.findListBoundaries(text));

    // Sort by position
    boundaries.sort((a, b) => a.position - b.position);

    return boundaries;
  }

  /**
   * Find sentence boundaries (., !, ?)
   */
  private static findSentenceBoundaries(text: string): Boundary[] {
    const boundaries: Boundary[] = [];
    const sentenceEndPattern = /[.!?]+(\s+|$)/g;
    let match;

    while ((match = sentenceEndPattern.exec(text)) !== null) {
      const endPos = match.index + match[0].length - (match[1]?.length || 0);
      boundaries.push({
        position: endPos,
        type: "sentence",
        confidence: 0.9,
      });
    }

    return boundaries;
  }

  /**
   * Find paragraph boundaries (double newline)
   */
  private static findParagraphBoundaries(text: string): Boundary[] {
    const boundaries: Boundary[] = [];
    const paragraphPattern = /\n\s*\n/g;
    let match;

    while ((match = paragraphPattern.exec(text)) !== null) {
      boundaries.push({
        position: match.index + match[0].length,
        type: "paragraph",
        confidence: 0.95,
      });
    }

    return boundaries;
  }

  /**
   * Find section boundaries (headers)
   */
  private static findSectionBoundaries(text: string): Boundary[] {
    const boundaries: Boundary[] = [];

    // Markdown headers
    const headerPattern = /^#{1,6}\s+.+$/gm;
    let match;
    while ((match = headerPattern.exec(text)) !== null) {
      boundaries.push({
        position: match.index,
        type: "section",
        confidence: 0.95,
      });
    }

    // Plain text section headers (lines in ALL CAPS followed by colon or newline)
    const allCapsPattern = /^[A-Z][A-Z0-9\s]{4,}:?\s*$/gm;
    while ((match = allCapsPattern.exec(text)) !== null) {
      if (match.index > 0 && text[match.index - 1] === "\n") {
        boundaries.push({
          position: match.index,
          type: "section",
          confidence: 0.7,
        });
      }
    }

    return boundaries;
  }

  /**
   * Find list item boundaries
   */
  private static findListBoundaries(text: string): Boundary[] {
    const boundaries: Boundary[] = [];

    // Bullet list items
    const bulletPattern = /^\s*[•\-*]\s+.+$/gm;
    let match;
    while ((match = bulletPattern.exec(text)) !== null) {
      boundaries.push({
        position: match.index,
        type: "list_item",
        confidence: 0.8,
      });
    }

    // Numbered list items
    const numberedPattern = /^\s*\d+[\.\)]\s+.+$/gm;
    while ((match = numberedPattern.exec(text)) !== null) {
      boundaries.push({
        position: match.index,
        type: "list_item",
        confidence: 0.8,
      });
    }

    return boundaries;
  }

  /**
   * Find best split point near a target position
   * Prefers paragraph breaks, then sentences, then exact position
   */
  static findBestSplitPoint(text: string, targetPosition: number, maxDeviation: number = 200): number {
    const boundaries = this.findBoundaries(text);

    // Filter boundaries near target position
    const nearby = boundaries.filter(
      (b) => Math.abs(b.position - targetPosition) <= maxDeviation
    );

    if (nearby.length === 0) {
      // No good boundary found, return target
      return Math.min(targetPosition, text.length);
    }

    // Prefer high-confidence boundaries closer to position
    nearby.sort((a, b) => {
      const distA = Math.abs(a.position - targetPosition);
      const distB = Math.abs(b.position - targetPosition);

      // Prioritize: type (paragraph > section > sentence > list), then confidence, then distance
      const typeScore = (b: Boundary) => {
        switch (b.type) {
          case "paragraph":
            return 4;
          case "section":
            return 3;
          case "sentence":
            return 2;
          case "list_item":
            return 1;
          default:
            return 0;
        }
      };

      const typeScoreA = typeScore(a);
      const typeScoreB = typeScore(b);

      if (typeScoreB !== typeScoreA) return typeScoreB - typeScoreA;
      if (Math.abs(b.confidence - a.confidence) > 0.1)
        return b.confidence - a.confidence;
      return distA - distB;
    });

    return nearby[0].position;
  }

  /**
   * Ensure text starts at a sentence boundary
   */
  static moveToSentenceStart(text: string, sourceText: string): string {
    if (!text || text.length < 10) return text;

    const firstChar = text[0];
    if (/^[A-Z-—–]/.test(firstChar)) {
      return text; // Already at sentence start
    }

    // Try to find this text in source and fix start
    const sourceIndex = sourceText.indexOf(text);
    if (sourceIndex <= 0) return text;

    // Look backward for sentence boundary
    const preceding = sourceText.substring(0, sourceIndex);
    const boundaries = this.findSentenceBoundaries(preceding);

    if (boundaries.length > 0) {
      const nearestEnd = boundaries[boundaries.length - 1];
      const nextCharPos = nearestEnd.position;
      const fixed = sourceText.substring(nextCharPos).trim();
      return fixed.substring(0, sourceIndex - nextCharPos + text.length).trim();
    }

    return text;
  }

  /**
   * Ensure text ends at a sentence boundary
   */
  static moveToSentenceEnd(text: string, sourceText: string): string {
    if (!text || text.length < 10) return text;

    // Already ends with sentence terminator
    if (/[.!?]\s*$/.test(text)) {
      return text;
    }

    // Find this text in source and extend to sentence end
    const sourceIndex = sourceText.indexOf(text);
    if (sourceIndex < 0) return text;

    const after = sourceText.substring(sourceIndex + text.length);
    const sentenceEndMatch = /[.!?]+/.exec(after);

    if (sentenceEndMatch) {
      const endPos = sourceIndex + text.length + sentenceEndMatch.index + sentenceEndMatch[0].length;
      return sourceText.substring(sourceIndex, endPos).trim();
    }

    return text;
  }

  /**
   * Split text into logical chunks respecting boundaries
   * Optimal for preventing mid-sentence splits
   */
  static splitIntoChunks(
    text: string,
    targetChunkSize: number,
    overlap: number = 0
  ): string[] {
    if (!text || text.length === 0) return [];
    if (targetChunkSize <= 0) return [text];

    const chunks: string[] = [];
    let pos = 0;
    const maxIterations = 10000; // Safety limit
    let iterations = 0;

    while (pos < text.length && iterations < maxIterations) {
      iterations++;
      let endPos = Math.min(pos + targetChunkSize, text.length);

      // If not at text end, find best split point
      if (endPos < text.length && endPos > pos) {
        const deviation = Math.max(50, Math.floor(targetChunkSize * 0.2));
        endPos = this.findBestSplitPoint(text, endPos, deviation);
      }

      // Make sure we have content to add
      if (endPos <= pos || endPos < pos + 20) {
        endPos = Math.min(pos + targetChunkSize, text.length);
      }

      const chunk = text.substring(Math.max(0, pos), Math.min(endPos, text.length)).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Move position forward
      const nextPos = endPos - overlap;
      if (nextPos <= pos) {
        // Prevent infinite loop
        pos = endPos;
      } else {
        pos = nextPos;
      }
    }

    return chunks;
  }

  /**
   * Check if a position is at a good boundary
   */
  static isAtBoundary(text: string, position: number, tolerance: number = 20): boolean {
    if (position <= 0 || position >= text.length) return true;

    const window = text.substring(Math.max(0, position - tolerance), Math.min(text.length, position + tolerance));

    // Check if position is near a sentence end, paragraph, or section
    const sentenceEndIndex = window.lastIndexOf(".");
    const paragraphIndex = window.lastIndexOf("\n\n");
    const exclamationIndex = window.lastIndexOf("!");
    const questionIndex = window.lastIndexOf("?");

    const relevantIndex = Math.max(sentenceEndIndex, paragraphIndex, exclamationIndex, questionIndex);

    return relevantIndex >= 0 && relevantIndex <= tolerance;
  }
}
