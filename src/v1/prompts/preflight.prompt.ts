
import { PromptTemplate } from "@langchain/core/prompts";

export const preflightPrompt = new PromptTemplate({
  inputVariables: ["message", "language", "history", "assistantName", "domainHint", "company", "brand"],
  template: `
You are {assistantName}.

Company: {company}
Brand: {brand}
Domain: {domainHint}

Language preference: {language}

Conversation history:
{history}

User message:
{message}

Return ONLY valid JSON (no markdown), with this exact schema:
{{
  "route": "SMALL_TALK" | "LANGUAGE_MISMATCH" | "NEEDS_CLARIFICATION" | "ANSWER_WITH_RAG",
  "languageOk": boolean,
  "detectedLanguage": "english" | "spanish" | "other",
  "hasGreeting": boolean,
  "isGreetingOnly": boolean,
  "isFollowUp": boolean,
  "rewrittenQuestion": string,
  "reason": string
}}

Rules:
- SMALL_TALK: greetings, thanks, acknowledgements, goodbyes, pleasantries, questions about the user's name/identity ("whats my name", "who am I", "remember my name", "refer to me by my name"), or casual chat not requiring domain data.
  Examples: "hi", "hello", "how are you", "my name is Hassan", "whats my name", "refer to me by my name", "thanks", "thank you", "ok", "got it", "bye".

- LANGUAGE_MISMATCH: the message is mainly not in the preferred {language}.

- NEEDS_CLARIFICATION: USE VERY SPARINGLY. ONLY use if the message is a single uninformative word like "help", "problem", "error", or "issue" with zero context. DO NOT use if the user names any specific topic, term, form, law, or phrase.

- ANSWER_WITH_RAG: DEFAULT FOR ALL QUESTIONS. Any query asking for information, laws, terms, forms, requirements, definitions, codes, or rules (e.g., "whats the law about review rating form", "whats review rating form", "what is NRS...") MUST be routed to ANSWER_WITH_RAG. Rewrite into a clear standalone question.


Follow-up rule:
- If the user message depends on the prior conversation, set isFollowUp=true AND rewrite as a fully standalone question using the missing context from history.
- If it does NOT depend on history, set isFollowUp=false.

Output constraints:
- If route is not ANSWER_WITH_RAG, rewrittenQuestion must be "".
- If route is ANSWER_WITH_RAG, rewrittenQuestion must be non-empty.
`,
});
