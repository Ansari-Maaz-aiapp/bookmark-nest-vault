import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ImageOff, Link2, Loader2, NotebookPen, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { fetchMetadata, type PageMetadata } from "@/lib/metadata.functions";
import { detectKind, domainOf, normalizeUrl, parseHttpUrl } from "@/lib/url";
import { findDuplicate, logActivity, setItemTags, useFolders, useInvalidateVault, type Item, KIND_LABEL } from "@/lib/vault";
import { Favicon } from "./ItemVisual";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Ctx = { openAdd: (opts?: { url?: string; mode?: "url" | "note"; folderId?: string }) => void; openEdit: (item: Item) => void };
const AddCtx = createContext<Ctx>({ openAdd: () => {}, openEdit: () => {} });
export const useAddItem = () => useContext(AddCtx);

type Form = {
  url: string;
  title: string;
  description: string;
  content: string;
  image_url: string;
  favicon_url: string;
  site_name: string;
  author: string;
  kind: string;
  folder_id: string;
  tags: string;
  readLater: boolean;
};
const EMPTY: Form = { url: "", title: "", description: "", content: "", image_url: "", favicon_url: "", site_name: "", author: "", kind: "link", folder_id: "none", tags: "", readLater: false };
const AUTO_FIELDS = ["title", "description", "image_url", "favicon_url", "site_name", "author", "kind"] as const;

export function AddItemProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "note">("url");
  const [editing, setEditing] = useState<Item | null>(null);
  const [initial, setInitial] = useState<Partial<Form>>({});
  const [nonce, setNonce] = useState(0);

  const openAdd = useCallback<Ctx["openAdd"]>((o) => {
    setEditing(null);
    setMode(o?.mode ?? "url");
    setInitial({ url: o?.url ?? "", folder_id: o?.folderId ?? "none" });
    setNonce((n) => n + 1);
    setOpen(true);
  }, []);
  const openEdit = useCallback((item: Item) => {
    setEditing(item);
    setMode(item.kind === "note" ? "note" : "url");
    setInitial({
      url: item.url ?? "",
      title: item.title,
      description: item.description ?? "",
      content: item.content ?? "",
      image_url: item.image_url ?? "",
      favicon_url: item.favicon_url ?? "",
      site_name: item.site_name ?? "",
      author: item.author ?? "",
      kind: item.kind,
      folder_id: item.folder_id ?? "none",
      tags: (item.item_tags ?? []).map((t) => t.tags?.name).filter(Boolean).join(", "),
      readLater: item.reading_status !== "none",
    });
    setNonce((n) => n + 1);
    setOpen(true);
  }, []);

  // Paste-to-save: Ctrl/Cmd+V of a URL anywhere outside a text field opens Add.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const text = e.clipboardData?.getData("text") ?? "";
      if (/^https?:\/\//i.test(text.trim())) openAdd({ url: text.trim() });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [openAdd]);

  return (
    <AddCtx.Provider value={{ openAdd, openEdit }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-dvh w-full max-w-full flex-col gap-0 overflow-hidden p-0 max-sm:h-dvh max-sm:rounded-none sm:max-h-[90dvh] sm:max-w-xl">
          <ItemForm key={nonce} mode={mode} setMode={setMode} editing={editing} initial={initial} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </AddCtx.Provider>
  );
}

function ItemForm({
  mode, setMode, editing, initial, onDone,
}: { mode: "url" | "note"; setMode: (m: "url" | "note") => void; editing: Item | null; initial: Partial<Form>; onDone: () => void }) {
  const [form, setForm] = useState<Form>({ ...EMPTY, ...initial });
  const touched = useRef(new Set<string>(editing ? AUTO_FIELDS : []));
  const [fetching, setFetching] = useState(false);
  const [meta, setMeta] = useState<PageMetadata | null>(null);
  const [dup, setDup] = useState<Item | null>(null);
  const [allowCopy, setAllowCopy] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: folders } = useFolders();
  const invalidate = useInvalidateVault();
  const getMeta = useServerFn(fetchMetadata);
  const isMobile = useIsMobile();
  const lastUrl = useRef(editing?.url ?? "");

  const set = (k: keyof Form, v: string | boolean, manual = true) => {
    if (manual) touched.current.add(k);
    setForm((f) => ({ ...f, [k]: v }));
  };

  useEffect(() => {
    if (mode !== "url") return;
    const raw = form.url.trim();
    const parsed = parseHttpUrl(raw);
    if (!parsed || raw === lastUrl.current) return;
    const handle = setTimeout(async () => {
      lastUrl.current = raw;
      const norm = normalizeUrl(raw)!;
      setAllowCopy(false);
      setDup(await findDuplicate(norm, editing?.id));
      setFetching(true);
      setMeta(null);
      // Detected type from URL pattern applies immediately.
      if (!touched.current.has("kind")) set("kind", detectKind(raw), false);
      const m = await getMeta({ data: { url: parsed.toString() } }).catch(() => ({ ok: false, error: "Could not reach the site" }) as PageMetadata);
      setFetching(false);
      setMeta(m);
      if (!m.ok) return;
      // Never overwrite what the user typed.
      const fill: Partial<Record<keyof Form, string | null | undefined>> = {
        title: m.title,
        description: m.description,
        image_url: m.image,
        favicon_url: m.favicon,
        site_name: m.siteName,
        author: m.author,
      };
      for (const [k, v] of Object.entries(fill)) if (v && !touched.current.has(k)) set(k as keyof Form, v.slice(0, 2000), false);
      if (m.canonicalUrl) {
        const cn = normalizeUrl(m.canonicalUrl);
        if (cn && cn !== norm) {
          const d2 = await findDuplicate(cn, editing?.id);
          if (d2) setDup(d2);
        }
      }
    }, 450);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url, mode]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "url" && !parseHttpUrl(form.url)) return toast.error("Enter a valid web address");
    if (dup && !allowCopy) return toast.error("This link is already in your vault");
    const title = form.title.trim() || (mode === "note" ? "Untitled note" : domainOf(form.url) || form.url);
    setSaving(true);
    const urlStr = mode === "url" ? parseHttpUrl(form.url)!.toString() : null;
    const row = {
      kind: mode === "note" ? "note" : form.kind,
      url: urlStr,
      normalized_url: urlStr ? normalizeUrl(urlStr) : null,
      title: title.slice(0, 500),
      description: form.description.trim() || null,
      content: mode === "note" ? form.content : null,
      image_url: form.image_url.trim() || null,
      favicon_url: form.favicon_url.trim() || null,
      site_name: form.site_name.trim() || null,
      author: form.author.trim() || null,
      domain: urlStr ? domainOf(urlStr) : null,
      folder_id: form.folder_id === "none" ? null : form.folder_id,
      published_at: meta?.publishedAt && !Number.isNaN(Date.parse(meta.publishedAt)) ? new Date(meta.publishedAt).toISOString() : editing?.published_at ?? null,
      reading_status: form.readLater ? (editing && editing.reading_status !== "none" ? editing.reading_status : "unread") : "none",
      duplicate_of: dup && allowCopy ? dup.id : (editing?.duplicate_of ?? null),
    };
    try {
      let id = editing?.id;
      if (editing) {
        const { error } = await supabase.from("items").update(row).eq("id", editing.id);
        if (error) throw error;
        await logActivity(editing.id, "edited");
      } else {
        const { data, error } = await supabase
          .from("items")
          .insert({ ...row, in_inbox: form.folder_id === "none" })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
        await logActivity(id, "added");
      }
      await setItemTags(id!, form.tags.split(","));
      invalidate();
      toast.success(editing ? "Saved changes" : "Saved to your vault", { description: title });
      onDone();
    } catch (err) {
      const msg = (err as { code?: string; message?: string })?.code === "23505" ? "This link is already in your vault" : (err as Error).message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const domain = domainOf(form.url);

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="border-b px-5 py-4 text-left">
        <DialogTitle>{editing ? "Edit item" : "Add to vault"}</DialogTitle>
        <DialogDescription className="sr-only">Save a link or write a note.</DialogDescription>
        {!editing && (
          <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "note")} className="pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url"><Link2 className="mr-1.5 size-4" /> Link</TabsTrigger>
              <TabsTrigger value="note"><NotebookPen className="mr-1.5 size-4" /> Note</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {mode === "url" && (
          <div className="space-y-1.5">
            <Label htmlFor="url">Web address</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                {fetching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : domain ? <Favicon item={{ favicon_url: form.favicon_url, domain, kind: "link" }} className="size-4" /> : <Link2 className="size-4 text-muted-foreground" />}
              </span>
              <Input
                id="url"
                autoFocus={!isMobile && !editing}
                inputMode="url"
                placeholder="Paste a link…"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                className="h-11 pl-9"
              />
            </div>
            {fetching && <p className="text-xs text-muted-foreground">Reading page details…</p>}
            {meta && !meta.ok && <p className="text-xs text-muted-foreground">Couldn't read details from this page ({meta.error}). You can fill them in yourself.</p>}
            {meta?.ok && <p className="text-xs text-success">Details filled in from the page — edit anything you like.</p>}
          </div>
        )}

        {dup && (
          <div className="rounded-xl border border-favorite/50 bg-favorite/10 p-3.5" role="alert">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4 text-favorite" /> Already in your vault
            </div>
            <div className="mt-2.5 flex items-start gap-2.5 rounded-lg bg-card p-2.5">
              <Favicon item={dup} />
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{dup.title}</p>
                <p className="truncate text-xs text-muted-foreground">{dup.url}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                  Saved {new Date(dup.created_at).toLocaleDateString()}
                  {dup.folder_id && folders ? ` · ${folders.find((f) => f.id === dup.folder_id)?.name ?? ""}` : ""}
                  {(dup.item_tags ?? []).map((t) => ` #${t.tags?.name}`).join("")}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" onClick={onDone}>
                <Link to="/item/$id" params={{ id: dup.id }}>Open existing</Link>
              </Button>
              <Button asChild size="sm" variant="outline" onClick={onDone}>
                <Link to="/item/$id" params={{ id: dup.id }} search={{ edit: true }}>Edit existing</Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={allowCopy ? "secondary" : "ghost"}
                onClick={() => {
                  if (allowCopy || window.confirm("Save a separate copy of a link you already have?")) setAllowCopy(!allowCopy);
                }}
              >
                {allowCopy ? "Copy will be saved ✓" : "Save as separate copy"}
              </Button>
            </div>
          </div>
        )}

        {mode === "url" && form.image_url && (
          <div className="relative overflow-hidden rounded-xl border">
            <img src={form.image_url} alt="Preview" referrerPolicy="no-referrer" className="aspect-[16/8] w-full object-cover" onError={() => set("image_url", "", false)} />
            <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2 size-8" onClick={() => set("image_url", "")} aria-label="Remove preview image">
              <ImageOff />
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} className="h-11" placeholder={mode === "note" ? "Note title" : "Page title"} />
        </div>

        {mode === "note" ? (
          <div className="space-y-1.5">
            <Label htmlFor="content">Note</Label>
            <Textarea id="content" rows={8} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Write anything worth keeping…" />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="flex items-center gap-1.5">
              Description {meta?.ok && meta.description && !touched.current.has("description") && <span className="font-mono text-[10px] text-muted-foreground">from page</span>}
            </Label>
            <Textarea id="desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Folder</Label>
            <Select value={form.folder_id} onValueChange={(v) => set("folder_id", v)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Inbox (no folder)</SelectItem>
                {folders?.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {mode === "url" && (
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.kind} onValueChange={(v) => set("kind", v)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABEL).filter(([k]) => k !== "note").map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags</Label>
          <Input id="tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="react, auth, reading" className="h-11" />
          <p className="text-xs text-muted-foreground">Separate with commas.</p>
        </div>

        <label className="flex items-center justify-between rounded-xl border px-3.5 py-3">
          <span className="text-sm">
            <span className="font-medium">Add to Reading Queue</span>
            <span className="block text-xs text-muted-foreground">Keep it in your unread list.</span>
          </span>
          <Switch checked={form.readLater} onCheckedChange={(v) => set("readLater", v)} />
        </label>

        {mode === "url" && (meta?.siteName || meta?.author || meta?.publishedAt) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <Sparkles className="hidden" />
            {meta.siteName && <span>Site: {meta.siteName}</span>}
            {meta.author && <span>Author: {meta.author}</span>}
            {meta.publishedAt && !Number.isNaN(Date.parse(meta.publishedAt)) && <span>Published: {new Date(meta.publishedAt).toLocaleDateString()}</span>}
          </div>
        )}
      </div>

      <div className={cn("flex items-center justify-end gap-2 border-t px-5 py-3.5 pb-safe")}>
        <Button type="button" variant="ghost" onClick={onDone}>
          <X className="sm:hidden" /> Cancel
        </Button>
        <Button type="submit" disabled={saving || (!!dup && !allowCopy)} className="min-w-28">
          {saving && <Loader2 className="animate-spin" />} {editing ? "Save" : "Save item"}
        </Button>
      </div>
    </form>
  );
}
