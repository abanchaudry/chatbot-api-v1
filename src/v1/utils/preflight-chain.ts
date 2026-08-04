import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { preflightPrompt } from "../prompts/preflight.prompt";

export function buildPreflightChain(apiKey: string) {
  const model = new ChatOpenAI({
    apiKey,
    model: "gpt-4o-mini",
    temperature: 0,
  });

  return RunnableSequence.from([
    preflightPrompt as any,
    model as any,
    new StringOutputParser(),
  ]);
}
