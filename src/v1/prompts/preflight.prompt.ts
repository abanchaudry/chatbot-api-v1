
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
- SMALL_TALK: greetings, thanks, acknowledgements, goodbyes, pleasantries, or casual chat not requiring domain data.
  Examples: "hi", "hello", "how are you", "thanks", "thank you", "ok", "got it", "bye".
- LANGUAGE_MISMATCH: the message is mainly not in the preferred {language}.
- NEEDS_CLARIFICATION: user asks for help but is too vague; request missing specifics.
- ANSWER_WITH_RAG: anything that should be answered using domain knowledge; rewrite into a clear standalone question.

Follow-up rule:
- If the user message depends on the prior conversation, set isFollowUp=true AND rewrite as a fully standalone question using the missing context from history.
- If it does NOT depend on history, set isFollowUp=false.

Output constraints:
- If route is not ANSWER_WITH_RAG, rewrittenQuestion must be "".
- If route is ANSWER_WITH_RAG, rewrittenQuestion must be non-empty.
`,
});
