import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isBlockedHost } from "./ssrf";

export type PageMetadata = {
  ok: boolean;
  error?: string;
  finalUrl?: string;
  canonicalUrl?: string | null;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  favicon?: string | null;
  siteName?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  lang?: string | null;
  contentType?: string | null;
};

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  return out;
}

function parse(html: string, base: string): Omit<PageMetadata, "ok"> {
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const a = attrs(tag);
    const key = (a.property || a.name || a.itemprop || "").toLowerCase();
    if (key && a.content && !(key in meta)) meta[key] = decode(a.content);
  }
  const links = (html.match(/<link\b[^>]*>/gi) ?? []).map(attrs);
  const abs = (u?: string | null) => {
    if (!u) return null;
    try {
      const r = new URL(u, base);
      return r.protocol === "http:" || r.protocol === "https:" ? r.toString() : null;
    } catch {
      return null;
    }
  };
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const icons = links.filter((l) => /(^|\s)(icon|apple-touch-icon)(\s|$)/i.test(l.rel ?? ""));
  const bestIcon =
    icons.find((l) => /apple-touch-icon/i.test(l.rel)) ??
    icons.sort((a, b) => parseInt(b.sizes ?? "0") - parseInt(a.sizes ?? "0"))[0];
  return {
    title: meta["og:title"] || meta["twitter:title"] || (titleTag ? decode(titleTag) : null) || null,
    description: meta["og:description"] || meta["description"] || meta["twitter:description"] || null,
    image: abs(meta["og:image"] || meta["og:image:url"] || meta["twitter:image"]),
    favicon: abs(bestIcon?.href) ?? abs("/favicon.ico"),
    siteName: meta["og:site_name"] || meta["application-name"] || null,
    author: meta["author"] || meta["article:author"] || null,
    publishedAt: meta["article:published_time"] || meta["datepublished"] || null,
    canonicalUrl: abs(links.find((l) => (l.rel ?? "").toLowerCase() === "canonical")?.href),
    lang: html.match(/<html[^>]*\blang=["']?([a-zA-Z-]+)/i)?.[1] ?? null,
  };
}

export async function fetchSafely(url: string, init: RequestInit = {}, maxHops = 5) {
  let current = url;
  for (let hop = 0; hop <= maxHops; hop++) {
    const u = new URL(current);
    if ((u.protocol !== "http:" && u.protocol !== "https:") || isBlockedHost(u.hostname)) {
      throw new Error("This address is not allowed");
    }
    const res = await fetch(current, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; LinkVaultBot/1.0; +personal-use)",
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        ...(init.headers ?? {}),
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    return { res, finalUrl: current, hops: hop };
  }
  throw new Error("Too many redirects");
}

export const fetchMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().url().max(2048) }).parse(d))
  .handler(async ({ data }): Promise<PageMetadata> => {
    try {
      const { res, finalUrl } = await fetchSafely(data.url);
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) return { ok: false, error: `The site answered with status ${res.status}`, finalUrl };
      if (!contentType.includes("html")) {
        await res.body?.cancel();
        return { ok: true, finalUrl, contentType, favicon: new URL("/favicon.ico", finalUrl).toString() };
      }
      // Read at most ~600KB of HTML.
      const reader = res.body!.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (size < 600_000) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.byteLength;
      }
      await reader.cancel().catch(() => {});
      const buf = new Uint8Array(size);
      let off = 0;
      for (const c of chunks) {
        buf.set(c, off);
        off += c.byteLength;
      }
      const html = new TextDecoder("utf-8").decode(buf);
      return { ok: true, finalUrl, contentType, ...parse(html, finalUrl) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Could not reach the site" };
    }
  });
