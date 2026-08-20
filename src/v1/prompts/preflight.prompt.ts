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
- SMALL_TALK: greetings, thanks, acknowledgements, goodbyes, pleasantries, general off-domain topics (e.g. general coding trivia, weather, sports not related to the organization's domain), or questions about the user's name/identity ("whats my name", "who am I", "remember my name").
  Examples: "hi", "hello", "how are you", "my name is Hassan", "whats my name", "thanks", "thank you", "ok", "bye".

- LANGUAGE_MISMATCH: the message is mainly not in the preferred {language}.

- NEEDS_CLARIFICATION: USE VERY SPARINGLY. ONLY use if the message is a single uninformative word like "help", "problem", "error", or "issue" with zero context. DO NOT use if the user names any specific topic, term, form, policy, or phrase.

- ANSWER_WITH_RAG: DEFAULT FOR ALL INQUIRIES. Any query asking for information, services, products, pricing, policies, requirements, portfolio, team, articles, contact, terms, or procedures MUST be routed to ANSWER_WITH_RAG.

Follow-up vs Global Organization Query Rules (CRITICAL):
1. TRUE FOLLOW-UP (isFollowUp=true):
   - The user asks a continuation question that directly relies on an entity, service, or policy discussed immediately prior (e.g. "whats the fee?", "how much is it?", "how do I apply for that?", "tell me more about this").
   - Action: Set isFollowUp=true AND rewrite into a clear standalone question combining the specific subject from history.
2. GLOBAL INQUIRY / TOPIC TRANSITION (isFollowUp=false):
   - If the user asks a company-wide or general organizational question (e.g. "who is on your team?", "who is your UI designer?", "tell me about your projects", "what articles do you have?", "what is your contact info?", "what services do you provide?"):
   - Action: DO NOT artificially bind it to the prior product or user specific context. Set isFollowUp=false AND rewrite as a clean standalone organization-wide question (e.g. "Who is on the team at {company}?", "Who is the UI designer at {company}?", "What portfolio projects has {company} worked on?").
3. STANDALONE GENERAL QUERY (isFollowUp=false):
   - If the query does not depend on prior history, set isFollowUp=false AND rewrite cleanly as a clear question.

Output constraints:
- If route is not ANSWER_WITH_RAG, rewrittenQuestion must be "".
- If route is ANSWER_WITH_RAG, rewrittenQuestion must be non-empty.
`,
});
