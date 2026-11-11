export type SharedItem = {
  title: string;
  url: string | null;
  description: string | null;
  domain: string | null;
  kind: string;
  image_url: string | null;
  favicon_url: string | null;
  content: string | null;
};

export type SharedFolder = {
  name: string;
  description: string | null;
  owner: string | null;
  items: SharedItem[];
};

/** 32 random hex chars — unguessable, and within the database's 20–64 length limit. */
export function newShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isValidShareToken(token: string): boolean {
  return /^[a-f0-9]{20,64}$/.test(token);
}

export function shareUrl(token: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  return `${origin}/shared/${token}`;
}

/** Plain-text version of a folder for messages, email or notes apps. */
export function folderAsText(name: string, items: { title: string; url: string | null }[]): string {
  const lines = items.map((i) => (i.url ? `• ${i.title}\n  ${i.url}` : `• ${i.title}`));
  return [`📁 ${name} (${items.length} ${items.length === 1 ? "item" : "items"})`, "", ...lines].join("\n");
}
