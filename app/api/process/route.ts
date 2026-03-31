import type { LinkResult } from "@/lib/types";

async function archiveUrl(url: string): Promise<{ archiveUrl: string | null; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(`https://web.archive.org/save/${encodeURIComponent(url)}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `url=${encodeURIComponent(url)}&capture_all=on`,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentLocation = response.headers.get("content-location");
    if (contentLocation) {
      return { archiveUrl: `https://web.archive.org${contentLocation}`, error: null };
    }

    if (response.ok || response.status === 302) {
      const location = response.headers.get("location");
      if (location) {
        const archiveUrl = location.startsWith("http") ? location : `https://web.archive.org${location}`;
        return { archiveUrl, error: null };
      }
    }

    const searchUrl = `https://web.archive.org/web/*/${url}`;
    return {
      archiveUrl: searchUrl,
      error: `Archive submitted, but snapshot URL could not be confirmed. Check: ${searchUrl}`,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { archiveUrl: null, error: "Request timed out after 30s" };
    }
    return { archiveUrl: null, error: String(err) };
  }
}

async function shortenUrl(url: string): Promise<{ shortUrl: string | null; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { shortUrl: null, error: `TinyURL returned HTTP ${response.status}` };
    }

    const text = await response.text();
    if (text.startsWith("http")) {
      return { shortUrl: text.trim(), error: null };
    }

    return { shortUrl: null, error: `Unexpected TinyURL response: ${text}` };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { shortUrl: null, error: "Request timed out after 10s" };
    }
    return { shortUrl: null, error: String(err) };
  }
}

export async function POST(request: Request) {
  const { urls } = await request.json() as { urls: string[] };

  if (!Array.isArray(urls) || urls.length === 0) {
    return Response.json({ error: "Provide a non-empty array of URLs" }, { status: 400 });
  }

  if (urls.length > 20) {
    return Response.json({ error: "Maximum 20 URLs per request" }, { status: 400 });
  }

  const validUrls = urls
    .map((u) => u.trim())
    .filter((u) => {
      try { new URL(u); return true; } catch { return false; }
    });

  const results: LinkResult[] = await Promise.all(
    validUrls.map(async (url): Promise<LinkResult> => {
      const [archiveResult, shortResult] = await Promise.all([archiveUrl(url), shortenUrl(url)]);

      const hasArchive = !!archiveResult.archiveUrl;
      const hasShort = !!shortResult.shortUrl;
      const status = hasArchive && hasShort ? "success" : hasArchive || hasShort ? "partial" : "error";

      return {
        originalUrl: url,
        archiveUrl: archiveResult.archiveUrl,
        archiveError: archiveResult.error,
        shortUrl: shortResult.shortUrl,
        shortError: shortResult.error,
        status,
      };
    })
  );

  return Response.json({ results });
}
