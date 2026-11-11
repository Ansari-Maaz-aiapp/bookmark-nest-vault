import { Link } from "@tanstack/react-router";
import { Pin, Star, Trash2, GitFork } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { KIND_LABEL, useFolders, useTrashItem, type Item } from "@/lib/vault";
import { Favicon, KindIcon, PreviewImage, repoParts } from "./ItemVisual";
import { ItemActions, useItemToggles } from "./ItemActions";
import { Button } from "@/components/ui/button";

export type ViewMode = "grid" | "list" | "compact";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Badges({ item }: { item: Item }) {
  return (
    <span className="flex items-center gap-1">
      {item.is_pinned && <Pin className="size-3.5 fill-pin text-pin" aria-label="Pinned" />}
      {item.is_favorite && <Star className="size-3.5 fill-favorite text-favorite" aria-label="Favorite" />}
    </span>
  );
}

function Tags({ item, max = 3 }: { item: Item; max?: number }) {
  const tags = (item.item_tags ?? []).map((t) => t.tags).filter(Boolean) as { id: string; name: string }[];
  if (!tags.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.slice(0, max).map((t) => (
        <Link
          key={t.id}
          to="/items"
          search={{ tag: t.id }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-secondary-foreground hover:bg-accent"
        >
          #{t.name}
        </Link>
      ))}
      {tags.length > max && <span className="text-[10px] text-muted-foreground">+{tags.length - max}</span>}
    </span>
  );
}

function subtitle(item: Item) {
  if (item.kind === "repo") {
    const { owner } = repoParts(item.url);
    return owner ? `github.com/${owner}` : item.domain;
  }
  if (item.kind === "note") return `Note · updated ${fmtDate(item.updated_at)}`;
  return item.site_name || item.domain;
}

export function ItemCard({ item, view, handle }: { item: Item; view: ViewMode; handle?: React.ReactNode }) {
  const { data: folders } = useFolders();
  const folder = folders?.find((f) => f.id === item.folder_id);
  const detail = { to: "/item/$id" as const, params: { id: item.id } };

  if (view === "grid") {
    return (
      <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
        <Link {...detail} className="relative block aspect-[16/9] overflow-hidden border-b bg-muted" aria-label={item.title}>
          <PreviewImage item={item} />
          {item.kind === "video" && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[11px] font-medium">
              <KindIcon kind="video" domain={item.domain} className="size-3.5 text-destructive" /> Video
            </span>
          )}
          {item.kind === "repo" && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 font-mono text-[11px]">
              <GitFork className="size-3" /> {repoParts(item.url).repo}
            </span>
          )}
        </Link>
        {handle && <div className="absolute left-2 top-2 z-10">{handle}</div>}
        <div className="flex flex-1 flex-col gap-2 p-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Favicon item={item} className="size-4" />
            <span className="min-w-0 flex-1 truncate">{subtitle(item)}</span>
            <Badges item={item} />
          </div>
          <Link {...detail} className="line-clamp-2 font-medium leading-snug hover:text-primary">
            {item.title}
          </Link>
          {item.description && <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <div className="min-w-0 space-y-1.5">
              <Tags item={item} />
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {KIND_LABEL[item.kind]} · {fmtDate(item.created_at)}
                {folder ? ` · ${folder.name}` : ""}
              </p>
            </div>
            <ItemActions item={item} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <SwipeRow item={item}>
      <div className={cn("flex items-center gap-3 bg-card px-3", view === "compact" ? "py-2" : "py-3", handle && "pl-1.5")}>
        {handle}
        {view === "list" ? (
          <Link {...detail} className="relative hidden size-16 shrink-0 overflow-hidden rounded-lg border bg-muted sm:block" tabIndex={-1} aria-hidden>
            <PreviewImage item={item} />
          </Link>
        ) : null}
        <Favicon item={item} className={view === "list" ? "sm:hidden" : ""} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link {...detail} className="truncate font-medium hover:text-primary">
              {item.title}
            </Link>
            <Badges item={item} />
          </div>
          {view === "list" && (
            <>
              <p className="truncate text-sm text-muted-foreground">{item.description || subtitle(item)}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {subtitle(item)} · {fmtDate(item.created_at)}
                  {folder ? ` · ${folder.name}` : ""}
                </span>
                <span className="hidden sm:block">
                  <Tags item={item} max={2} />
                </span>
              </div>
            </>
          )}
        </div>
        {view === "compact" && (
          <span className="hidden font-mono text-[11px] text-muted-foreground md:block">{fmtDate(item.created_at)}</span>
        )}
        <ItemActions item={item} />
      </div>
    </SwipeRow>
  );
}

/** Swipe right to favorite, left to move to Trash (with undo). Buttons remain available. */
function SwipeRow({ item, children }: { item: Item; children: React.ReactNode }) {
  const { toggleFavorite } = useItemToggles();
  const trash = useTrashItem();
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);
  const locked = useRef<"x" | "y" | null>(null);
  const T = 90;

  return (
    <div className="relative overflow-hidden rounded-xl border">
      <div className="absolute inset-0 flex items-center justify-between px-5" aria-hidden>
        <span className={cn("flex items-center gap-2 text-sm font-medium text-favorite transition-opacity", dx > 20 ? "opacity-100" : "opacity-0")}>
          <Star className="size-5" /> {item.is_favorite ? "Unfavorite" : "Favorite"}
        </span>
        <span className={cn("flex items-center gap-2 text-sm font-medium text-destructive transition-opacity", dx < -20 ? "opacity-100" : "opacity-0")}>
          Trash <Trash2 className="size-5" />
        </span>
      </div>
      <div
        className="relative touch-pan-y"
        style={{ transform: `translateX(${dx}px)`, transition: start.current ? "none" : "transform .2s ease" }}
        onTouchStart={(e) => {
          start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          locked.current = null;
        }}
        onTouchMove={(e) => {
          if (!start.current) return;
          const mx = e.touches[0].clientX - start.current.x;
          const my = e.touches[0].clientY - start.current.y;
          if (!locked.current && (Math.abs(mx) > 8 || Math.abs(my) > 8)) locked.current = Math.abs(mx) > Math.abs(my) ? "x" : "y";
          if (locked.current === "x") setDx(Math.max(-140, Math.min(140, mx)));
        }}
        onTouchEnd={() => {
          if (dx > T) toggleFavorite(item);
          else if (dx < -T) trash(item);
          start.current = null;
          setDx(0);
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ItemGrid({ items, view }: { items: Item[]; view: ViewMode }) {
  return (
    <div
      className={cn(
        view === "grid" ? "grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "flex flex-col gap-2",
      )}
    >
      {items.map((i) => (
        <ItemCard key={i.id} item={i} view={view} />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">{icon}</span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export { Button };
