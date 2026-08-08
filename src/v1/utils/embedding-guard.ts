
export const MODEL_DIMS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
};

export function embeddingDimForModel(model: string): number {
  return MODEL_DIMS[model] ?? 1536;
}


export function assertVectorsMatchIndex(vectors: number[][], model: string) {
  const expected = embeddingDimForModel(model);
  for (let i = 0; i < vectors.length; i++) {
    const v = vectors[i];
    if (!Array.isArray(v) || v.length !== expected) {
      throw new Error(
        `Embedding dimension mismatch at index ${i}: got ${v?.length}, expected ${expected} for model ${model}`
      );
    }
    for (let j = 0; j < v.length; j++) {
      const x = v[j];
      if (!Number.isFinite(x)) {
        throw new Error(`Embedding contains non-finite value at [${i}, ${j}]`);
      }
    }
  }
}

export function assertEmbeddingCount(expectedCount: number, vectors: number[][]) {
  if (vectors.length !== expectedCount) {
    throw new Error(`Embedding count mismatch: expected ${expectedCount}, got ${vectors.length}`);
  }
}

export function extractLawSectionFromQuestion(message: string): string | null {
  if (!message) return null;
  const sectionRegex = /\b(?:nrs|nac)?\s*624\.\d{3}\b/i;
  const match = message.toLowerCase().match(sectionRegex);
  if (!match) return null;
  const raw = match[0].replace(/\s+/g, "");
  const clean = raw.replace(/^(nrs|nac)/i, "");
  return clean.trim();
}
