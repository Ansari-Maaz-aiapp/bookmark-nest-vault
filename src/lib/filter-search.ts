import type { ItemFilter } from "./vault";

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
export function parseFilter(s: Record<string, unknown>): ItemFilter {
  const range = str(s.range);
  const sort = str(s.sort);
  return {
    q: str(s.q),
    kind: str(s.kind),
    folder: str(s.folder),
    tag: str(s.tag),
    status: str(s.status),
    domain: str(s.domain),
    range: range && ["today", "7d", "30d", "90d"].includes(range) ? (range as ItemFilter["range"]) : undefined,
    sort: sort && ["new", "old", "az", "viewed", "updated", "popular"].includes(sort) ? (sort as ItemFilter["sort"]) : undefined,
  };
}
