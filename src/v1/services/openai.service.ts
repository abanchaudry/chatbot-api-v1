import { ChatOpenAI } from "@langchain/openai";

export const DEFAULT_FALLBACK_MESSAGE = "I'm not sure based on the provided information.";

type AskOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemExtras?: string;
  tenantName?: string;        // optional: "Example Company", "Client X", etc.
  fallbackMessage?: string;   // optional per tenant
};

const DEFAULTS: Required<Omit<AskOptions, "tenantName" | "fallbackMessage">> = {
  model: "gpt-4o",
  temperature: 0.2,
  maxTokens: 600,
  systemExtras: "",
};

function truncateChars(s: string, maxChars: number): string {
  if (!s) return "";
  if (s.length <= maxChars) return s;
  const soft = s.lastIndexOf("\n\n", maxChars);
  return (soft > maxChars * 0.6 ? s.slice(0, soft) : s.slice(0, maxChars)).trim();
}

function asText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const text = content
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
    return text || "";
  }
  return String(content ?? "").trim();
}

function buildSystemPrompt(args: {
  boundedContext: string;
  fallbackMessage: string;
  systemExtras?: string;
  tenantName?: string;
}): string {
  const { boundedContext, fallbackMessage, systemExtras, tenantName } = args;

  return `You are a careful, compliance-minded assistant${tenantName ? ` for ${tenantName}` : ""}.

Answer ONLY using the "Context" below. If the answer is not clearly contained in the context, reply exactly with:
${fallbackMessage}

Rules:
- Do not speculate or infer beyond the context.
- If the context is ambiguous or incomplete, return the fallback message.
- Prefer concise, direct answers.
- Use bullet points for lists; otherwise use brief paragraphs.
${systemExtras ? `\nAdditional guidance:\n${systemExtras}\n` : ""}

Context:
${boundedContext}`;
}

export const openaiService = {
  askWithContext: async (
    question: string,
    context: string,
    apiKey: string,
    opts?: AskOptions
  ): Promise<string> => {
    const { model, temperature, maxTokens, systemExtras } = { ...DEFAULTS, ...(opts || {}) };
    const fallbackMessage = (opts?.fallbackMessage || DEFAULT_FALLBACK_MESSAGE).trim() || DEFAULT_FALLBACK_MESSAGE;

    const structuredContext = (context || "").trim();
    if (!structuredContext) return fallbackMessage;

    const boundedContext = truncateChars(structuredContext, 12_000);

    const systemPrompt = buildSystemPrompt({
      boundedContext,
      fallbackMessage,
      systemExtras,
      tenantName: opts?.tenantName,
    });

    const modelClient = new ChatOpenAI({
      apiKey,
      model,
      temperature,
      maxTokens,
    });

    const res = await modelClient.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: (question || "").toString().trim() },
    ]);

    const text = asText((res as any)?.content);
    return text || fallbackMessage;
  },

  askWithContextStream: async function* (
    question: string,
    context: string,
    apiKey: string,
    opts?: AskOptions
  ): AsyncIterable<string> {
    const { model, temperature, maxTokens, systemExtras } = { ...DEFAULTS, ...(opts || {}) };
    const fallbackMessage = (opts?.fallbackMessage || DEFAULT_FALLBACK_MESSAGE).trim() || DEFAULT_FALLBACK_MESSAGE;

    const structuredContext = (context || "").trim();
    if (!structuredContext) {
      yield fallbackMessage;
      return;
    }

    const boundedContext = truncateChars(structuredContext, 12_000);

    const systemPrompt = buildSystemPrompt({
      boundedContext,
      fallbackMessage,
      systemExtras,
      tenantName: opts?.tenantName,
    });

    const modelClient = new ChatOpenAI({
      apiKey,
      model,
      temperature,
      maxTokens,
      streaming: true,
    });

    const stream = await modelClient.stream([
      { role: "system", content: systemPrompt },
      { role: "user", content: (question || "").toString().trim() },
    ]);

    for await (const chunk of stream) {
      const piece = asText((chunk as any)?.content);
      if (piece) yield piece;
    }
  },
};
