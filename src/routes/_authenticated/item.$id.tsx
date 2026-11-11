import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ChevronLeft, ExternalLink, Pin, Star, Pencil, Loader2 } from "lucide-react";
import { itemQuery, KIND_LABEL, useFolders } from "@/lib/vault";
import { Favicon, PreviewImage } from "@/components/items/ItemVisual";
import { ItemActions, openItem, useItemToggles } from "@/components/items/ItemActions";
import { useAddItem } from "@/components/items/AddItemProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/item/$id")({
  validateSearch: (s: Record<string, unknown>): { edit?: boolean } => ({ edit: s.edit ? true : undefined }),
  head: () => ({
    meta: [
      { title: "Item — LinkVault" },
      { name: "description", content: "Details of a saved item." },
      { property: "og:title", content: "Item — LinkVault" },
      { property: "og:description", content: "Details of a saved item." },
    ],
  }),
  component: Page,
});

function youtubeId(url: string | null) {
  try {
    const u = new URL(url ?? "");
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch { /* ignore */ }
  return null;
}

function Page() {
  const { id } = Route.useParams();
  const { edit } = Route.useSearch();
  const router = useRouter();
  const { data: item, isLoading } = useQuery(itemQuery(id));
  const { data: folders } = useFolders();
  const { toggleFavorite, togglePin } = useItemToggles();
  const { openEdit } = useAddItem();
  const opened = useRef(false);
  useEffect(() => {
    if (edit && item && !opened.current) { opened.current = true; openEdit(item); }
  }, [edit, item, openEdit]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (!item) return <p className="text-muted-foreground">This item doesn't exist or was deleted forever. <Link to="/items" className="text-primary">Back to All Items</Link></p>;
  const folder = folders?.find((f) => f.id === item.folder_id);
  const yt = item.kind === "video" ? youtubeId(item.url) : null;
  const tags = (item.item_tags ?? []).map((t) => t.tags).filter(Boolean) as { id: string; name: string }[];

  return (
    <article className="mx-auto max-w-3xl">
      <button onClick={() => router.history.back()} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Back</button>
      {item.deleted_at && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">This item is in Trash.</p>}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        {yt ? (
          <div className="aspect-video bg-muted"><iframe className="size-full" src={`https://www.youtube-nocookie.com/embed/${yt}`} title={item.title} allowFullScreen loading="lazy" /></div>
        ) : item.kind !== "note" && item.image_url ? (
          <div className="aspect-[16/8] border-b bg-muted"><PreviewImage item={item} /></div>
        ) : null}
        <div className="space-y-4 p-5 sm:p-7">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Favicon item={item} />
            <span className="truncate">{item.site_name || item.domain || KIND_LABEL[item.kind]}</span>
            <span className="ml-auto font-mono text-[11px] uppercase">{KIND_LABEL[item.kind]}</span>
          </div>
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{item.title}</h1>
          {item.description && <p className="text-muted-foreground">{item.description}</p>}
          {item.kind === "note" && <div className="whitespace-pre-wrap leading-relaxed">{item.content}</div>}
          {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="block break-all font-mono text-xs text-primary hover:underline">{item.url}</a>}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => <Link key={t.id} to="/items" search={{ tag: t.id }} className="rounded-full bg-secondary px-2.5 py-1 font-mono text-xs hover:bg-accent">#{t.name}</Link>)}
            </div>
          )}
          <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Saved</dt><dd>{new Date(item.created_at).toLocaleDateString()}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Folder</dt><dd>{folder ? <Link to="/folders/$id" params={{ id: folder.id }} className="hover:text-primary">{folder.name}</Link> : "No folder"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Opened</dt><dd>{item.view_count}×</dd></div>
            {item.author && <div><dt className="text-xs text-muted-foreground">Author</dt><dd>{item.author}</dd></div>}
            {item.published_at && <div><dt className="text-xs text-muted-foreground">Published</dt><dd>{new Date(item.published_at).toLocaleDateString()}</dd></div>}
          </dl>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {item.url && <Button onClick={() => openItem(item)}><ExternalLink /> Open</Button>}
            <Button variant="outline" onClick={() => openEdit(item)}><Pencil /> Edit</Button>
            <Button variant="outline" onClick={() => togglePin(item)}><Pin className={cn(item.is_pinned && "fill-pin text-pin")} /> {item.is_pinned ? "Pinned" : "Pin"}</Button>
            <Button variant="outline" onClick={() => toggleFavorite(item)}><Star className={cn(item.is_favorite && "fill-favorite text-favorite")} /> {item.is_favorite ? "Favorited" : "Favorite"}</Button>
            <span className="ml-auto"><ItemActions item={item} /></span>
          </div>
        </div>
      </div>
    </article>
  );
}
