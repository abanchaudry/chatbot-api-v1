import { PromptTemplate } from "@langchain/core/prompts";

export const preflightPrompt = new PromptTemplate({
  inputVariables: ["message", "language", "history", "assistantName", "domainHint", "company", "brand", "currentDate"],
  template: `
You are {assistantName}.

Company: {company}
Brand: {brand}
Domain: {domainHint}
Current Date & Time: {currentDate}

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
  "subQueries": string[],
  "reason": string
}}

Rules:
- SMALL_TALK: greetings, thanks, acknowledgements, goodbyes, pleasantries, general off-domain topics (e.g. coding concepts like linked lists, weather, general trivia not related to the organization's domain), or questions about the user's name/identity ("whats my name", "who am I", "remember my name").
  Examples: "hi", "hello", "how are you", "my name is Hassan", "whats my name", "tell me about linkedlists", "thanks", "thank you", "ok", "bye".

- LANGUAGE_MISMATCH: the message is mainly not in the preferred {language}.

- NEEDS_CLARIFICATION: USE VERY SPARINGLY. ONLY use if the message is a single uninformative word like "help", "problem", "error", or "issue" with zero context. DO NOT use if the user names any specific topic, term, form, law, or phrase.

- ANSWER_WITH_RAG: DEFAULT FOR ALL QUESTIONS. Any query asking for information, laws, terms, forms, requirements, definitions, codes, or rules (e.g., "whats NRS 624.570", "whats review rating form", "what is NRS...") MUST be routed to ANSWER_WITH_RAG. When rewriting general queries like "whats NRS X" or "whats Policy Y", rewrite cleanly as "What is NRS X?" without adding unrequested narrow words like "requirements" or "fees".


Follow-up rule:
- If the user message depends on the prior conversation, set isFollowUp=true AND rewrite as a fully standalone question using the missing context from history.
- If it does NOT depend on history, set isFollowUp=false.

Output constraints:
- If route is not ANSWER_WITH_RAG, rewrittenQuestion must be "".
- If route is ANSWER_WITH_RAG, rewrittenQuestion must be non-empty.
`,
});
