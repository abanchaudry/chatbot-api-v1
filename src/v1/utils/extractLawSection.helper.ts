
export function extractLawSectionFromQuestion(message: string): string | null {
  if (!message) return null;

  const lowerMessage = message.toLowerCase();
  const sectionRegex = /\b(?:nrs|nac)?\s*624\.\d{3}\b/i;
  const match = lowerMessage.match(sectionRegex);

  if (!match) return null;

  const raw = match[0].replace(/\s+/g, '');
  const clean = raw.replace(/^(nrs|nac)/i, '');

  return clean.trim();
}
