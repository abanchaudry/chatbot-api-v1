import { PromptTemplate } from "@langchain/core/prompts";

export const questionGenPrompt = PromptTemplate.fromTemplate(`
You generate end-user questions for QA testing of a support chatbot.

Return ONLY valid JSON, no markdown.

INPUTS:
- tone: "{tone}" (professional|friendly|human|business|auto)
- language: "{language}" (english|spanish)
- pagesJson: {pagesJson}

RULES:
- Generate questions that a real user would ask.
- Questions must be grounded in the provided page text.
- Mix factual + procedural + navigation questions.
- Avoid duplicates.
- Keep each question <= 140 chars where possible.

OUTPUT JSON FORMAT:
{{
  "questions": [
    {{
      "pageUrl": "https://...",
      "pageTitle": "string",
      "question": "string",
      "intent": "info|howto|contact|payments|login|documents|services|other",
      "tone": "string",
      "difficulty": "easy|medium|hard"
    }}
  ]
}}
`);
