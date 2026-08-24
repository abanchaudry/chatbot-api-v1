import type { Env } from "../types/env";
import { CRAWLER_CONFIG } from "../constants";

export type CrawledPageResult = {
  url: string;
  title: string;
  markdown: string;
  method: "browser_run" | "edge_fetch";
};

/**
 * Strips HTML boilerplate tags (nav, header, footer, script, style, iframe, svg)
 * and converts HTML into clean readable Markdown text.
 */
export function htmlToCleanMarkdown(htmlString: string, url: string): { title: string; markdown: string } {
  let text = htmlString || "";

  // Extract page title
  const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  // Remove scripts, styles, noscript, svg, header, footer, nav
  text = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ");

  // Convert headings & layout tags to markdown
  text = text
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n\n# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gi, "\n\n#### $1\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "\n\n$1\n\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "\n- $1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<tr[^>]*>(.*?)<\/tr>/gi, "$1\n")
    .replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi, " | $1 ");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode basic HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace and empty lines
  const cleanLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1].length > 0));

  const markdown = cleanLines.join("\n").trim();
  return { title, markdown };
}

export async function crawlWebPage(
  env: Env["Bindings"],
  targetUrl: string
): Promise<CrawledPageResult> {
  const url = targetUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("Invalid URL format. Must start with http:// or https://");
  }

  // Check if Cloudflare Browser Run (Puppeteer) is available
  if (env.MY_BROWSER) {
    try {
      const puppeteerModuleName = "@cloudflare/puppeteer";
      const puppeteer = await (import(puppeteerModuleName as any) as Promise<any>);
      const browser = await (puppeteer.default || puppeteer).launch(env.MY_BROWSER);
      const page = await browser.newPage();

      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
      const pageTitle = await page.title();
      const contentHtml = await page.content();
      await browser.close();

      const { markdown } = htmlToCleanMarkdown(contentHtml, url);
      return {
        url,
        title: pageTitle || url,
        markdown: `# ${pageTitle || url}\n\n${markdown}`,
        method: "browser_run",
      };
    } catch (browserError: any) {
      console.warn("Cloudflare Browser Run error, falling back to Edge Fetch:", browserError?.message);
    }
  }

  // Edge Fetcher fallback
  let html = "";

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("text/plain") &&
        !contentType.includes("application/xhtml+xml")
      ) {
        throw new Error(`Unsupported Content-Type: ${contentType}. Only web HTML/text pages are supported.`);
      }
      const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
      if (contentLength > CRAWLER_CONFIG.MAX_PAGE_CONTENT_BYTES) {
        throw new Error(`Page size exceeds maximum allowed limit (${(contentLength / 1024 / 1024).toFixed(1)}MB).`);
      }
      html = await res.text();
    } else {
      console.warn(`Direct fetch returned status ${res.status}, trying Jina reader proxy...`);
    }
  } catch (err: any) {
    console.warn("Direct fetch failed, trying Jina reader proxy...", err.message);
  }

  // If direct fetch was blocked (e.g. 403 Akamai/Cloudflare anti-bot), try Jina Reader Proxy
  if (!html || html.includes("Access Denied") || html.includes("errors.edgesuite.net")) {
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          Accept: "text/html, application/json",
          "X-No-Cache": "true",
        },
      });
      if (jinaRes.ok) {
        const jinaText = await jinaRes.text();
        if (jinaText && jinaText.length > 50 && !jinaText.includes("Access Denied")) {
          const { title, markdown } = htmlToCleanMarkdown(jinaText, url);
          return {
            url,
            title: title || url,
            markdown: `# ${title || url}\n\n${markdown}`,
            method: "edge_fetch",
          };
        }
      }
    } catch (jinaErr: any) {
      console.warn("Jina proxy fetch failed:", jinaErr.message);
    }
  }

  if (!html) {
    throw new Error(`Failed to fetch web page. The target website blocks automated crawlers.`);
  }

  const { title, markdown } = htmlToCleanMarkdown(html, url);

  return {
    url,
    title,
    markdown: `# ${title}\n\n${markdown}`,
    method: "edge_fetch",
  };
}

export type DiscoveredPage = {
  url: string;
  title: string;
  depth: number;
};

/**
 * Normalizes hostnames by stripping leading "www." for flexible domain matching.
 */
function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

/**
 * Checks if two URLs belong to the same root domain or subdomains.
 */
function isSameDomain(urlA: string, urlB: string): boolean {
  try {
    const hostA = normalizeHostname(new URL(urlA).hostname);
    const hostB = normalizeHostname(new URL(urlB).hostname);
    return hostA === hostB || hostA.endsWith(`.${hostB}`) || hostB.endsWith(`.${hostA}`);
  } catch {
    return false;
  }
}

/**
 * Decodes standard HTML entities in page titles.
 */
function decodeEntities(text: string): string {
  return (text || "")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "…")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#\d+;/g, "");
}

/**
 * Infers a clean human-readable title from URL pathname when <title> is missing.
 */
function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    if (parts.length === 0) return u.hostname.replace(/^www\./, "");
    const lastPart = parts[parts.length - 1];
    return decodeEntities(
      lastPart
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  } catch {
    return url;
  }
}

/**
 * Extract all internal HTTP/HTTPS links from HTML or Markdown text.
 */
function extractInternalLinks(htmlOrMarkdown: string, currentUrl: string, rootUrl: string): string[] {
  const links: string[] = [];
  const badExts = [
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
    ".css", ".js", ".xml", ".json", ".zip", ".gz", ".tar", ".mp4",
    ".mp3", ".wav", ".woff", ".woff2", ".ttf", ".eot"
  ];

  // 1. Standard HTML href regex (double quotes, single quotes, unquoted)
  const hrefRegex = /href\s*=\s*["']?([^"'>\s#]+)["']?/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(htmlOrMarkdown)) !== null) {
    const rawHref = match[1].trim();
    if (!rawHref || rawHref.startsWith("javascript:") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
      continue;
    }

    try {
      const urlObj = new URL(rawHref, currentUrl);
      if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") continue;
      if (!isSameDomain(urlObj.toString(), rootUrl)) continue;

      const lowerPath = urlObj.pathname.toLowerCase();
      if (badExts.some((ext) => lowerPath.endsWith(ext))) continue;

      if (
        lowerPath.includes("/wp-json") ||
        lowerPath.includes("/xmlrpc") ||
        lowerPath.includes("/feed") ||
        lowerPath.includes("/wp-admin") ||
        lowerPath.includes("/wp-includes") ||
        lowerPath.includes("/cart") ||
        lowerPath.includes("/checkout")
      ) {
        continue;
      }

      urlObj.hash = "";
      urlObj.search = "";
      let cleanUrl = urlObj.toString();
      if (cleanUrl.endsWith("/")) {
        cleanUrl = cleanUrl.slice(0, -1);
      }

      links.push(cleanUrl);
    } catch {
      // Invalid URL
    }
  }

  // 2. Markdown link regex [text](https://...)
  const mdRegex = /\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/gi;
  while ((match = mdRegex.exec(htmlOrMarkdown)) !== null) {
    const rawUrl = match[2].trim();
    try {
      const urlObj = new URL(rawUrl, currentUrl);
      if (isSameDomain(urlObj.toString(), rootUrl)) {
        urlObj.hash = "";
        urlObj.search = "";
        let cleanUrl = urlObj.toString();
        if (cleanUrl.endsWith("/")) cleanUrl = cleanUrl.slice(0, -1);
        links.push(cleanUrl);
      }
    } catch {}
  }

  return [...new Set(links)];
}

/**
 * Fetches the raw text of an XML sitemap.
 */
async function fetchSingleSitemapXml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "application/xml,text/xml,text/html,*/*",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.text();
    }
  } catch {
    // Ignore fetch errors
  }
  return null;
}

/**
 * Attempts to fetch XML sitemaps to quickly discover all indexed URLs.
 * Supports direct sitemap URLs, sitemap index hierarchies, and auto-discovery.
 */
async function tryFetchSitemaps(origin: string, rootUrl: string, maxPages: number): Promise<DiscoveredPage[]> {
  const isDirectSitemap = rootUrl.toLowerCase().endsWith(".xml") || rootUrl.toLowerCase().includes("sitemap");

  const sitemapCandidates: string[] = isDirectSitemap
    ? [rootUrl]
    : [
        `${origin}/sitemap.xml`,
        `${origin}/sitemap_index.xml`,
        `${origin}/wp-sitemap.xml`,
        `${origin}/sitemap1.xml`,
      ];

  const seenSitemaps = new Set<string>();
  const pageMap = new Map<string, DiscoveredPage>();

  for (const sitemapUrl of sitemapCandidates) {
    if (pageMap.size >= maxPages) break;
    if (seenSitemaps.has(sitemapUrl)) continue;
    seenSitemaps.add(sitemapUrl);

    const xmlText = await fetchSingleSitemapXml(sitemapUrl);
    if (!xmlText) continue;

    const locMatches = xmlText.match(/<loc>(https?:\/\/[^<]+)<\/loc>/gi);
    if (!locMatches || locMatches.length === 0) continue;

    const nestedSitemaps: string[] = [];

    for (const locTag of locMatches) {
      const locUrl = locTag.replace(/<\/?loc>/gi, "").trim();
      if (!isSameDomain(locUrl, rootUrl)) continue;

      let clean = locUrl.split("#")[0].split("?")[0];
      if (clean.endsWith("/")) clean = clean.slice(0, -1);

      if (clean.toLowerCase().endsWith(".xml") || clean.toLowerCase().includes("sitemap")) {
        if (!seenSitemaps.has(clean) && nestedSitemaps.length < 20) {
          nestedSitemaps.push(clean);
        }
      } else {
        if (!pageMap.has(clean)) {
          pageMap.set(clean, {
            url: clean,
            title: titleFromUrl(clean),
            depth: 1,
          });
        }
      }

      if (pageMap.size >= maxPages) break;
    }

    // Process nested sitemaps if any found (sitemap index format)
    for (const nestedUrl of nestedSitemaps) {
      if (pageMap.size >= maxPages) break;
      if (seenSitemaps.has(nestedUrl)) continue;
      seenSitemaps.add(nestedUrl);

      const nestedXml = await fetchSingleSitemapXml(nestedUrl);
      if (!nestedXml) continue;

      const nestedLocs = nestedXml.match(/<loc>(https?:\/\/[^<]+)<\/loc>/gi);
      if (!nestedLocs) continue;

      for (const locTag of nestedLocs) {
        const locUrl = locTag.replace(/<\/?loc>/gi, "").trim();
        if (!isSameDomain(locUrl, rootUrl)) continue;

        let clean = locUrl.split("#")[0].split("?")[0];
        if (clean.endsWith("/")) clean = clean.slice(0, -1);

        if (!clean.toLowerCase().endsWith(".xml") && !pageMap.has(clean)) {
          pageMap.set(clean, {
            url: clean,
            title: titleFromUrl(clean),
            depth: 1,
          });
        }
        if (pageMap.size >= maxPages) break;
      }
    }

    if (pageMap.size > 0) {
      console.log(`[Crawler] Discovered ${pageMap.size} URLs via sitemap(s) starting from ${sitemapUrl}`);
      break;
    }
  }

  return Array.from(pageMap.values());
}

/**
 * Fetches HTML or falls back to Jina proxy if blocked.
 */
async function fetchPageHtmlWithFallback(url: string): Promise<{ html: string; title: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  let html = "";
  let title = titleFromUrl(url);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html") || contentType.includes("application/xhtml+xml")) {
        html = await res.text();
        const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (tm && tm[1].trim()) title = decodeEntities(tm[1].trim());
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // Jina proxy fallback if blocked or empty
  if (!html || html.includes("Access Denied") || html.includes("errors.edgesuite.net")) {
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: { Accept: "text/html, application/json", "X-No-Cache": "true" },
      });
      if (jinaRes.ok) {
        html = await jinaRes.text();
        const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (tm && tm[1].trim()) title = decodeEntities(tm[1].trim());
      }
    } catch {}
  }

  return { html, title };
}

/**
 * RECURSIVE MULTI-DEPTH LINK DISCOVERY
 * Discovers sub-pages up to maxDepth and maxPages.
 */
export async function discoverLinks(
  env: Env["Bindings"],
  rootUrl: string,
  maxDepth: number = 2,
  maxPages: number = 200
): Promise<DiscoveredPage[]> {
  try {
    const rootUrlObj = new URL(rootUrl);
    const origin = rootUrlObj.origin;

    rootUrlObj.hash = "";
    rootUrlObj.search = "";
    let cleanRootUrl = rootUrlObj.toString();
    if (cleanRootUrl.endsWith("/")) {
      cleanRootUrl = cleanRootUrl.slice(0, -1);
    }

    const visited = new Set<string>();
    const resultsMap = new Map<string, DiscoveredPage>();

    // 1. Try Sitemap Discovery First (fastest & most comprehensive)
    const sitemapPages = await tryFetchSitemaps(origin, cleanRootUrl, maxPages);
    if (sitemapPages.length > 0) {
      sitemapPages.forEach((p) => resultsMap.set(p.url, p));
      const sitemapResults = Array.from(resultsMap.values()).slice(0, maxPages);
      sitemapResults.sort((a, b) => (a.depth !== b.depth ? a.depth - b.depth : a.url.localeCompare(b.url)));
      return sitemapResults;
    }

    // If the user explicitly provided an XML / sitemap link and nothing was discovered, return empty
    if (cleanRootUrl.toLowerCase().endsWith(".xml") || cleanRootUrl.toLowerCase().includes("sitemap")) {
      return [];
    }

    // 2. Fetch Root Page (Depth 0)
    visited.add(cleanRootUrl);
    const rootPageData = await fetchPageHtmlWithFallback(cleanRootUrl);
    resultsMap.set(cleanRootUrl, { url: cleanRootUrl, title: rootPageData.title, depth: 0 });

    if (!rootPageData.html) {
      return Array.from(resultsMap.values());
    }

    // 3. Extract Depth 1 Links
    const depth1Links = extractInternalLinks(rootPageData.html, cleanRootUrl, cleanRootUrl)
      .filter((u) => u !== cleanRootUrl && !visited.has(u))
      .slice(0, maxPages - 1);

    depth1Links.forEach((u) => visited.add(u));

    // Parallel title fetching for Depth 1 links
    const depth1Results = await Promise.all(
      depth1Links.map(async (u) => {
        const data = await fetchPageHtmlWithFallback(u);
        return { url: u, title: data.title, html: data.html, depth: 1 };
      })
    );

    depth1Results.forEach((item) => {
      resultsMap.set(item.url, { url: item.url, title: item.title, depth: 1 });
    });

    // 4. If maxDepth >= 2 and results are under maxPages, crawl Depth 2 from the top Depth 1 pages
    if (maxDepth >= 2 && resultsMap.size < maxPages && depth1Results.length > 0) {
      const crawlSubset = depth1Results.slice(0, 30); // Inspect top Depth 1 pages for Depth 2 links
      const depth2Candidates: string[] = [];

      for (const d1Page of crawlSubset) {
        if (resultsMap.size + depth2Candidates.length >= maxPages) break;
        if (d1Page.html) {
          const linksFromD1 = extractInternalLinks(d1Page.html, d1Page.url, cleanRootUrl);
          for (const u of linksFromD1) {
            if (!visited.has(u) && !resultsMap.has(u)) {
              visited.add(u);
              depth2Candidates.push(u);
              if (resultsMap.size + depth2Candidates.length >= maxPages) break;
            }
          }
        }
      }

      if (depth2Candidates.length > 0) {
        const depth2Results = await Promise.all(
          depth2Candidates.slice(0, maxPages - resultsMap.size).map(async (u) => {
            const data = await fetchPageHtmlWithFallback(u);
            return { url: u, title: data.title, depth: 2 };
          })
        );

        depth2Results.forEach((item) => {
          resultsMap.set(item.url, item);
        });
      }
    }

    const results = Array.from(resultsMap.values()).slice(0, maxPages);
    results.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.url.localeCompare(b.url);
    });

    console.log(`[Crawler] Discovered total ${results.length} pages for ${cleanRootUrl}`);
    return results;
  } catch (err) {
    console.error("Error in discoverLinks:", err);
    return [];
  }
}

