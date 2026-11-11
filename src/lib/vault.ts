import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { reorder } from "./order";

export type Item = Database["public"]["Tables"]["items"]["Row"] & {
  item_tags?: { tags: { id: string; name: string } | null }[];
};
export type ItemInsert = Database["public"]["Tables"]["items"]["Insert"];
export type ItemUpdate = Database["public"]["Tables"]["items"]["Update"];
export type Folder = Database["public"]["Tables"]["folders"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];

export type ItemFilter = {
  q?: string;
  kind?: string;
  folder?: string;
  tag?: string;
  fav?: boolean;
  pinned?: boolean;
  range?: "today" | "7d" | "30d" | "90d";
  sort?: "custom" | "new" | "old" | "az" | "viewed" | "updated" | "popular";
  trash?: boolean;
  domain?: string;
};

const ITEM_SELECT = "*, item_tags(tags(id,name))";

export const keys = {
  items: (f: ItemFilter) => ["items", f] as const,
  item: (id: string) => ["item", id] as const,
  folders: ["folders"] as const,
  tags: ["tags"] as const,
  activity: ["activity"] as const,
  prefs: ["prefs"] as const,
};

function rangeStart(r: ItemFilter["range"]) {
  const d = new Date();
  if (r === "today") d.setHours(0, 0, 0, 0);
  else if (r === "7d") d.setDate(d.getDate() - 7);
  else if (r === "30d") d.setDate(d.getDate() - 30);
  else if (r === "90d") d.setDate(d.getDate() - 90);
  else return null;
  return d.toISOString();
}

/** "custom" is the user's own drag-and-drop order; pinned pages default to pin order. */
export function effectiveSort(f: ItemFilter) {
  return f.sort ?? (f.pinned ? "pin" : "custom");
}

export const itemsQuery = (f: ItemFilter) =>
  queryOptions({
    queryKey: keys.items(f),
    queryFn: async () => {
      let q = supabase.from("items").select(ITEM_SELECT).limit(500);
      q = f.trash ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
      if (f.kind) q = f.kind === "link" ? q.in("kind", ["link", "article"]) : q.eq("kind", f.kind);
      if (f.folder) q = f.folder === "none" ? q.is("folder_id", null) : q.eq("folder_id", f.folder);
      if (f.fav) q = q.eq("is_favorite", true);
      if (f.pinned) q = q.eq("is_pinned", true);
      if (f.domain) q = q.eq("domain", f.domain);
      const start = rangeStart(f.range);
      if (start) q = q.gte("created_at", start);
      if (f.q) {
        const s = f.q.replace(/[%,()]/g, " ").trim();
        if (s) q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%,url.ilike.%${s}%,content.ilike.%${s}%,domain.ilike.%${s}%`);
      }
      if (f.tag) {
        const { data: links } = await supabase.from("item_tags").select("item_id").eq("tag_id", f.tag);
        q = q.in("id", (links ?? []).map((l) => l.item_id));
      }
      const sort = effectiveSort(f);
      if (sort === "custom") q = q.order("sort_order").order("created_at", { ascending: false });
      else if (sort === "pin") q = q.order("pin_order").order("created_at", { ascending: false });
      else if (sort === "old") q = q.order("created_at", { ascending: true });
      else if (sort === "az") q = q.order("title");
      else if (sort === "viewed") q = q.order("last_viewed_at", { ascending: false, nullsFirst: false });
      else if (sort === "updated") q = q.order("updated_at", { ascending: false });
      else if (sort === "popular") q = q.order("view_count", { ascending: false });
      else q = q.order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data as Item[];
    },
  });

export const itemQuery = (id: string) =>
  queryOptions({
    queryKey: keys.item(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select(ITEM_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Item | null;
    },
  });

export const foldersQuery = queryOptions({
  queryKey: keys.folders,
  queryFn: async () => {
    const { data, error } = await supabase.from("folders").select("*").order("position").order("name");
    if (error) throw error;
    return data;
  },
});

export const tagsQuery = queryOptions({
  queryKey: keys.tags,
  queryFn: async () => {
    const { data, error } = await supabase.from("tags").select("*, item_tags(count)").order("name");
    if (error) throw error;
    return data as (Tag & { item_tags: { count: number }[] })[];
  },
});

export const activityQuery = queryOptions({
  queryKey: keys.activity,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*, items(id,title,kind,domain)")
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw error;
    return data;
  },
});

/** All non-deleted items, lightweight, for dashboard counts and charts. */
export const statsQuery = queryOptions({
  queryKey: ["items", "stats"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("items")
      .select("id,kind,folder_id,is_favorite,is_pinned,created_at,domain")
      .is("deleted_at", null)
      .limit(5000);
    if (error) throw error;
    return data;
  },
});

export function useFolders() {
  return useQuery(foldersQuery);
}
export function useTags() {
  return useQuery(tagsQuery);
}

export async function logActivity(item_id: string | null, action: string) {
  await supabase.from("activity_logs").insert({ item_id, action });
}

export async function findDuplicate(normalized: string, excludeId?: string) {
  let q = supabase
    .from("items")
    .select("*, item_tags(tags(id,name))")
    .eq("normalized_url", normalized)
    .is("deleted_at", null)
    .is("duplicate_of", null)
    .limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return (data?.[0] as Item | undefined) ?? null;
}

export async function setItemTags(itemId: string, names: string[]) {
  const clean = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))];
  await supabase.from("item_tags").delete().eq("item_id", itemId);
  if (!clean.length) return;
  const { data: existing } = await supabase.from("tags").select("id,name").in("name", clean);
  const have = new Map((existing ?? []).map((t) => [t.name, t.id]));
  const missing = clean.filter((n) => !have.has(n));
  if (missing.length) {
    const { data: created } = await supabase.from("tags").insert(missing.map((name) => ({ name }))).select("id,name");
    for (const t of created ?? []) have.set(t.name, t.id);
  }
  await supabase.from("item_tags").insert(clean.map((n) => ({ item_id: itemId, tag_id: have.get(n)! })));
}

export function useInvalidateVault() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["item"] });
    qc.invalidateQueries({ queryKey: keys.tags });
    qc.invalidateQueries({ queryKey: keys.folders });
    qc.invalidateQueries({ queryKey: keys.activity });
  };
}

export function useUpdateItem() {
  const invalidate = useInvalidateVault();
  return useMutation({
    mutationFn: async ({ id, patch, action }: { id: string; patch: ItemUpdate; action?: string }) => {
      const { error } = await supabase.from("items").update(patch).eq("id", id);
      if (error) throw error;
      if (action) await logActivity(id, action);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTrashItem() {
  const update = useUpdateItem();
  return (item: Pick<Item, "id" | "title">) =>
    update.mutate(
      { id: item.id, patch: { deleted_at: new Date().toISOString() }, action: "trashed" },
      {
        onSuccess: () =>
          toast("Moved to Trash", {
            description: item.title,
            action: {
              label: "Undo",
              onClick: () => update.mutate({ id: item.id, patch: { deleted_at: null }, action: "restored" }),
            },
          }),
      },
    );
}

/** Drag-and-drop reorder within the list currently on screen; only the moved item is saved. */
export function useReorderItems(filter: ItemFilter) {
  const qc = useQueryClient();
  return async (list: Item[], from: number, to: number) => {
    if (from === to) return;
    const { list: next, position } = reorder(list, from, to);
    qc.setQueryData(keys.items(filter), next);
    const { error } = await supabase.from("items").update({ sort_order: position }).eq("id", list[from].id);
    if (error) toast.error("Couldn't save the new order");
    qc.invalidateQueries({ queryKey: ["items"] });
  };
}

export async function recordView(item: Pick<Item, "id" | "view_count">) {
  await supabase
    .from("items")
    .update({ last_viewed_at: new Date().toISOString(), view_count: (item.view_count ?? 0) + 1 })
    .eq("id", item.id);
}

export const KIND_LABEL: Record<string, string> = {
  link: "Link",
  article: "Article",
  video: "Video",
  repo: "Repository",
  pdf: "PDF",
  image: "Image",
  doc: "Document",
  note: "Note",
  other: "Other",
};

export const FOLDER_COLORS = ["amber", "rose", "sky", "emerald", "violet", "slate"] as const;
