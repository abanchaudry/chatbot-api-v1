export type QueryIntent =
  | "person"
  | "policy"
  | "faq"
  | "process"
  | "contact"
  | "section"
  | "follow_up"
  | "ambiguous";

export type QuerySearchMode =
  | "entity_exact"
  | "section_exact"
  | "phrase_exact"
  | "follow_up_contextual"
  | "support_broad";

export type QueryPlan = {
  intent: QueryIntent;
  entities: string[];
  exactPhrases: string[];
  sectionRef: string | null;
  searchMode: QuerySearchMode;
  needsClarification: boolean;
  usesHistory: boolean;
  searchQuery: string;
  keywords: string[];
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "about",
  "assistant",
  "can",
  "do",
  "done",
  "for",
  "get",
  "give",
  "guys",
  "have",
  "ahve",
  "has",
  "help",
  "how",
  "hows",
  "how's",
  "i",
  "in",
  "is",
  "me",
  "of",
  "our",
  "please",
  "show",
  "tell",
  "the",
  "to",
  "ur",
  "us",
  "what",
  "whats",
  "what's",
  "where",
  "wheres",
  "where's",
  "who",
  "whos",
  "who's",
  "whose",
  "with",
  "you",
  "your",
]);

function normalize(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuotedPhrases(question: string): string[] {
  const matches = String(question || "").match(/"([^"]+)"|'([^']+)'/g) || [];
  return matches
    .map((value) => value.replace(/^["']|["']$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

function extractSectionRef(question: string): string | null {
  const text = normalize(question);
  const refMatch =
    text.match(/\b(?:nrs|nac)\s+\d+(?:\.\d+)+\b/) ||
    text.match(/\b(?:section|article|step|part|clause|item|faq)\s+\d+[a-z0-9.-]*\b/);
  if (refMatch) return refMatch[0];

  return null;
}

function extractLatestUserTurn(historyPreview: string): string {
  const matches = Array.from(String(historyPreview || "").matchAll(/User:\s*(.+)/g));
  return matches.length ? String(matches[matches.length - 1]?.[1] || "").trim() : "";
}

function extractQuestionFocus(question: string): string[] {
  const text = normalize(question);
  const patterns = [
    /^(?:who is|who s|whos|whose|tell me about|about)\s+(.+)$/,
    /^(?:what is|what s|whats|show me|tell me|give me|share|find|need|looking for)\s+(?:the\s+)?(.+)$/,
    /^(?:how do i|how can i)\s+(.+)$/,
  ];

  const phrases = new Set<string>(extractQuotedPhrases(question));

  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1];
    if (!match) continue;

    const cleaned = match
      .replace(/\b(?:at|of|for)\s+(?:the\s+)?(?:company|agency|firm|team|business|organization)\b/g, " ")
      .replace(/\b(?:please|thanks|thank you)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned) phrases.add(cleaned);

    const trimmed = cleaned.replace(/\b(?:of|for|about)\s+[a-z0-9\s]{2,40}$/g, "").trim();
    if (trimmed) phrases.add(trimmed);
  }

  return Array.from(phrases).filter((value) => value && value.split(/\s+/).length <= 8);
}

function extractEntities(question: string, exactPhrases: string[], intent: QueryIntent): string[] {
  const text = normalize(question);
  const entities = new Set<string>();

  if (intent === "person") {
    for (const phrase of exactPhrases) {
      const cleaned = normalize(phrase)
        .replace(/\b(?:the|a|an|your|ur|our)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned) entities.add(cleaned);
    }

    const directMatch =
      text.match(/^(?:who is|who s|whos|whose|tell me about|about)\s+(.+)$/)?.[1] || "";
    const cleaned = normalize(directMatch)
      .replace(/\b(?:the|a|an|your|ur|our)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) entities.add(cleaned);
  }

  return Array.from(entities).filter(Boolean);
}

function extractKeywords(question: string, exactPhrases: string[], entities: string[]): string[] {
  const words = normalize(question).match(/[a-z0-9.]{3,}/g) || [];
  const fromWords = words.filter((word) => !STOP_WORDS.has(word));
  const fromPhrases = [...exactPhrases, ...entities].flatMap((phrase) =>
    normalize(phrase).match(/[a-z0-9.]{3,}/g) || []
  );

  return Array.from(new Set([...fromWords, ...fromPhrases])).slice(0, 12);
}

function detectIntent(question: string, sectionRef: string | null, usesHistory: boolean): QueryIntent {
  const text = normalize(question);

  if (usesHistory) return "follow_up";
  if (sectionRef) return "section";
  if (/\bwho is\b|\bwho s\b|\bwhos\b|\bwhose\b|\bleadership\b|\bpresident\b|\bteam\b|\bmembers\b|\bdesigner\b|\bengineer\b|\bdeveloper\b|\bmanager\b|\bstrategist\b|\barchitect\b|\blead\b|\bauthor\b/.test(text)) {
    return "person";
  }
  if (/\bpolicy\b|\bprivacy\b|\brefund\b|\bcancellation\b|\bstatement\b|\bterms\b/.test(text)) {
    return "policy";
  }
  if (/\baddress\b|\bphone\b|\bemail\b|\boffice\b|\bcontact\b|\bmailing\b|\blocation\b/.test(text)) {
    return "contact";
  }
  if (/\bfaq\b|\bfrequently asked\b|\bwhere can i\b|\bcan i\b/.test(text)) {
    return "faq";
  }
  if (/\bhow\b|\bsteps\b|\bprocess\b|\brequest\b|\bobtain\b|\baccess\b|\bget\b|\bproject\b|\bprojects\b|\bportfolio\b|\bcase stud\b|\bwork\b|\bclient\b|\btools\b|\btechnology\b|\btechnologies\b|\bservices\b/.test(text)) {
    return "process";
  }

  return "ambiguous";
}

function needsHistory(question: string): boolean {
  const text = normalize(question);
  if (text.length > 80) return false;
  return /\b(he|she|it|they|them|that|this|those|these|there|here|him|her)\b/.test(text) ||
    /^(and|what about|how about)\b/.test(text);
}

function buildSearchQuery(question: string, historyPreview: string, usesHistory: boolean): string {
  if (!usesHistory) return question;
  const latestUserTurn = extractLatestUserTurn(historyPreview);
  return latestUserTurn ? `${latestUserTurn} ${question}` : question;
}

export function planQuery(question: string, historyPreview = ""): QueryPlan {
  const sectionRef = extractSectionRef(question);
  const usesHistory = needsHistory(question);
  const intent = detectIntent(question, sectionRef, usesHistory);
  const exactPhrases = extractQuestionFocus(question);
  const entities = extractEntities(question, exactPhrases, intent);
  const keywords = extractKeywords(question, exactPhrases, entities);
  const searchMode: QuerySearchMode =
    sectionRef ? "section_exact" :
    entities.length ? "entity_exact" :
    exactPhrases.length ? "phrase_exact" :
    usesHistory ? "follow_up_contextual" :
    "support_broad";

  const normalizedQuestion = normalize(question);
  const needsClarification =
    normalizedQuestion.length < 4 ||
    (
      intent === "ambiguous" &&
      !sectionRef &&
      !entities.length &&
      !exactPhrases.length &&
      keywords.length < 2
    );

  return {
    intent,
    entities,
    exactPhrases,
    sectionRef,
    searchMode,
    needsClarification,
    usesHistory,
    searchQuery: buildSearchQuery(question, historyPreview, usesHistory),
    keywords,
  };
}
