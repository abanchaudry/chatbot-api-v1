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

function extractInternalLinks(html: string, currentUrl: string, origin: string): string[] {
  const links: string[] = [];
  const regex = /href=["']([^"'#?]+)/gi;
  let match;
  
  const badExts = ['.pdf', '.jpg', '.png', '.css', '.js', '.svg', '.ico', '.xml', '.json', '.zip', '.gz', '.mp4', '.mp3', '.woff', '.woff2', '.ttf', '.eot'];

  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    try {
      const urlObj = new URL(href, currentUrl);
      
      if (urlObj.origin !== origin || (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:')) {
        continue;
      }
      
      const lowerPath = urlObj.pathname.toLowerCase();
      if (badExts.some(ext => lowerPath.endsWith(ext))) {
        continue;
      }

      // Filter out non-content utility paths
      if (
        lowerPath.includes('/wp-json') ||
        lowerPath.includes('/xmlrpc') ||
        lowerPath.includes('/feed') ||
        lowerPath.includes('/wp-admin') ||
        lowerPath.includes('/wp-includes') ||
        lowerPath.includes('/cart') ||
        lowerPath.includes('/checkout')
      ) {
        continue;
      }
      
      urlObj.hash = '';
      urlObj.search = '';
      let cleanUrl = urlObj.toString();
      if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      
      links.push(cleanUrl);
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  return [...new Set(links)];
}

export async function discoverLinks(
  env: Env["Bindings"],
  rootUrl: string,
  maxDepth: number = 2,
  maxPages: number = 50
): Promise<DiscoveredPage[]> {
  try {
    const rootUrlObj = new URL(rootUrl);
    const origin = rootUrlObj.origin;
    
    rootUrlObj.hash = '';
    rootUrlObj.search = '';
    let cleanRootUrl = rootUrlObj.toString();
    if (cleanRootUrl.endsWith('/')) {
      cleanRootUrl = cleanRootUrl.slice(0, -1);
    }

    const visited = new Set<string>();
    const resultsMap = new Map<string, DiscoveredPage>();

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

    // Infer human-readable title from URL pathname
    function titleFromUrl(url: string): string {
      try {
        const u = new URL(url);
        const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
        if (parts.length === 0) return u.hostname;
        const lastPart = parts[parts.length - 1];
        return decodeEntities(lastPart
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase()));
      } catch {
        return url;
      }
    }

    // Fast HTML title fetcher
    async function fetchPageTitleFast(url: string): Promise<string> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CRAWLER_CONFIG.DEFAULT_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            const text = await res.text();
            const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1].trim()) {
              return decodeEntities(titleMatch[1].trim());
            }
          }
        }
      } catch {
        clearTimeout(timeoutId);
      }
      return titleFromUrl(url);
    }

    // 1. Fetch Root Page (Depth 0)
    visited.add(cleanRootUrl);
    
    // Root fetch
    const rootController = new AbortController();
    const rootTimeout = setTimeout(() => rootController.abort(), CRAWLER_CONFIG.FALLBACK_FETCH_TIMEOUT_MS);
    let rootHtml = "";
    let rootTitle = titleFromUrl(cleanRootUrl);

    try {
      const rootRes = await fetch(cleanRootUrl, {
        redirect: "follow",
        signal: rootController.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(rootTimeout);
      if (rootRes.ok) {
        rootHtml = await rootRes.text();
        const tm = rootHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (tm && tm[1].trim()) rootTitle = decodeEntities(tm[1].trim());
      }
    } catch {
      clearTimeout(rootTimeout);
    }

    resultsMap.set(cleanRootUrl, { url: cleanRootUrl, title: rootTitle, depth: 0 });

    // 2. Extract links from root page HTML
    if (rootHtml) {
      const allExtractedLinks = extractInternalLinks(rootHtml, cleanRootUrl, origin);

      // Separate into direct level 1 links (depth 1)
      const targetLinks = allExtractedLinks
        .filter(u => u !== cleanRootUrl && !visited.has(u))
        .slice(0, Math.min(maxPages - 1, 40));

      targetLinks.forEach(u => visited.add(u));

      // Fetch titles for all Depth 1 links IN PARALLEL in a single pass
      const titleResults = await Promise.all(
        targetLinks.map(async (u) => {
          const t = await fetchPageTitleFast(u);
          return { url: u, title: t };
        })
      );

      titleResults.forEach(item => {
        resultsMap.set(item.url, { url: item.url, title: item.title, depth: 1 });
      });
    }

    const results = Array.from(resultsMap.values()).slice(0, maxPages);
    results.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.url.localeCompare(b.url);
    });

    return results;
  } catch (err) {
    console.error("Error in discoverLinks:", err);
    return [];
  }
}

