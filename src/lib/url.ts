export type ItemKind =
  | "link"
  | "article"
  | "video"
  | "repo"
  | "pdf"
  | "image"
  | "doc"
  | "note"
  | "other";

// Query params that only track where a click came from and never change content.
const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^dclid$/i,
  /^msclkid$/i,
  /^mc_(cid|eid)$/i,
  /^igshid$/i,
  /^ref_src$/i,
  /^si$/i,
  /^_hs(enc|mi)$/i,
  /^yclid$/i,
];

export function parseHttpUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return u;
  } catch {
    return null;
  }
}

/** Canonical form used for duplicate detection. */
export function normalizeUrl(input: string): string | null {
  const u = parseHttpUrl(input);
  if (!u) return null;
  let host = u.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (id) return `youtube.com/watch?v=${id}`;
  }
  if (host === "youtube.com" && u.pathname.startsWith("/shorts/")) {
    const id = u.pathname.split("/")[2];
    if (id) return `youtube.com/watch?v=${id}`;
  }
  const params = [...u.searchParams.entries()]
    .filter(([k]) => !TRACKING_PARAMS.some((r) => r.test(k)))
    .sort(([a], [b]) => a.localeCompare(b));
  if (host === "youtube.com" && u.pathname === "/watch") {
    const v = u.searchParams.get("v");
    if (v) return `youtube.com/watch?v=${v}`;
  }
  let path = u.pathname.replace(/\/+$/, "");
  if (host === "github.com") path = path.toLowerCase();
  const port = u.port && u.port !== "80" && u.port !== "443" ? `:${u.port}` : "";
  host = host + port;
  const qs = params.length ? `?${new URLSearchParams(params).toString()}` : "";
  return `${host}${path}${qs}`;
}

export function domainOf(input: string): string | null {
  const u = parseHttpUrl(input);
  return u ? u.hostname.replace(/^www\./, "") : null;
}

export function detectKind(input: string): ItemKind {
  const u = parseHttpUrl(input);
  if (!u) return "link";
  const host = u.hostname.replace(/^www\./, "");
  const path = u.pathname.toLowerCase();
  if (/(^|\.)youtube\.com$|^youtu\.be$|(^|\.)vimeo\.com$/.test(host)) return "video";
  if (host === "github.com" && path.split("/").filter(Boolean).length >= 2) return "repo";
  if (path.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/.test(path)) return "image";
  if (/\.(mp4|webm|mov)$/.test(path)) return "video";
  if (/\.(docx?|xlsx?|pptx?|csv|txt)$/.test(path)) return "doc";
  return "link";
}

export function faviconFor(domain: string | null | undefined): string | null {
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : null;
}
