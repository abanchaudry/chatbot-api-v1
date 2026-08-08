export function detectFileType(content: string): 'law' | 'faq' | 'html' | 'invoice' | 'pdf' | 'raw' {
  const sample = content.slice(0, 3000).toLowerCase();
  if (/nrs\s+624\.\d{3}|nac\s+624\.\d{3}/.test(sample)) return 'law';
  if (/^(who|what|how|can|are|when|where|why)\b.*\?\s?/m.test(sample)) return 'faq';
  if (/<[^>]+>/.test(sample) || /<html/i.test(sample)) return 'html';
  if (/invoice|total amount|balance due|bill to|item|unit price/.test(sample)) return 'invoice';
  if (sample.includes('%pdf')) return 'pdf';
  return 'raw';
}
