// models/ai-knowledge.model.ts

export interface AiKnowledgeFile {
  id: string;
  fileType: string;
  fileId: string;
  strategy: string;
  version:string;
}

export interface Chunk {
  index: number;
  content: string;
  section: string;
  tags?: string[];
  topic?: string;
}

export interface SaveChunksPayload {
  fileName: string,
  uploadId: string,
  version: string,
   chunks: Chunk[];
}
