
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

type VectorItem = {
  id?: string;
  text?: string;
  content?: string;
  topic?: string;
  type?: string;
  metadata?: Record<string, any>;
};

export async function vectorRetriever(
  apiKey: string,
  vectorData: VectorItem[],
  topK = 8
) {
  const embeddings = new OpenAIEmbeddings({ apiKey });

  const docs = vectorData.map((item) => {
    const pageContent = (item.text ?? item.content ?? "").toString();
    return new Document({
      pageContent,
      metadata: {
        id: item.id ?? "",
        topic: item.topic ?? "general",
        type: item.type ?? "vector",
        ...(item.metadata || {}),
      },
    });
  });

}
