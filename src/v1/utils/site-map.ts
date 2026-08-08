export async function fetchSitemapUrls(sitemapUrl: string, fetchFn: typeof fetch, max = 50) {
  const res = await fetchFn(sitemapUrl, { cf: { cacheTtl: 60 } });
  if (!res.ok) throw new Error(`Failed sitemap: ${res.status}`);
  const xml = await res.text();

  // crude but works
  const urls = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g)).map(m => m[1]).filter(Boolean);

  // remove obvious non-pages if needed
  const cleaned = urls
    .filter(u => u.startsWith("http"))
    .filter(u => !u.includes("/wp-json/"))
    .slice(0, max);

  return cleaned;
}
