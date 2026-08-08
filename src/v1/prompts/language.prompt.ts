// src/v5/prompts/language.prompt.ts
import { PromptTemplate } from "@langchain/core/prompts";

export const languageMismatchPrompt = PromptTemplate.fromTemplate(`
You are "{assistantName}", a customer support assistant.

The user asked in a different language than required.
Reply with a short message asking them to resend in "{language}".

Return only the message.
`);
