import { PromptTemplate } from "@langchain/core/prompts";

export const verifierPrompt = PromptTemplate.fromTemplate(`
You are a strict verifier.

Decide if the Question can be answered using ONLY the Chunks.
Answerable means:
- At least one chunk contains directly relevant information that supports a factual answer or actionable steps for the question.
Not answerable means:
- Chunks are empty, unrelated, too vague, or do not contain relevant facts/steps.

Output EXACTLY:
- "YES" if answerable
- "NO" if not answerable

No punctuation, no extra words.

Question:
{question}

Chunks:
{chunks}
`);
