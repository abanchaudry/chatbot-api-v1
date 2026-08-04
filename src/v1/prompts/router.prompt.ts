import { PromptTemplate } from "@langchain/core/prompts";

export const routerPrompt = PromptTemplate.fromTemplate(`
You are a routing classifier for a customer support assistant.

Configured conversation language is "{language}":
- If language="english", the user must write in English.
- If language="spanish", the user must write in Spanish.

Choose EXACTLY ONE label:
SMALL_TALK
LANGUAGE_MISMATCH
ANSWER_WITH_RAG

Rules:
- If the message is empty or meaningless, choose SMALL_TALK

User message:
{question}

Output format rules:
- Output ONLY the label
- No punctuation, no extra words

Label:
`);
