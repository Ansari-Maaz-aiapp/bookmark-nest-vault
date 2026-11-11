import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  Activity, ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Folder, GripVertical, Hash, Layers, Link2, Maximize2, Minimize2,
  NotebookPen, Pin, Plus, RotateCcw, SlidersHorizontal, Sparkles, Star, Clock,
} from "lucide-react";
import { activityQuery, itemsQuery, KIND_LABEL, statsQuery, useFolders, useTags } from "@/lib/vault";
import { supabase } from "@/integrations/supabase/client";
import { Favicon } from "@/components/items/ItemVisual";
import { useAddItem } from "@/components/items/AddItemProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — LinkVault" },
      { name: "description", content: "Your personal knowledge vault at a glance." },
      { property: "og:title", content: "LinkVault — Everything Worth Saving" },
      { property: "og:description", content: "Your personal knowledge vault at a glance." },
    ],
  }),
  component: Dashboard,
});

type WidgetId = "overview" | "pinned" | "pinnedFolders" | "favorites" | "recent" | "weekly" | "kinds" | "folders" | "tags" | "activity" | "domains";
type W = { id: WidgetId; hidden?: boolean; collapsed?: boolean; wide?: boolean };
const TITLES: Record<WidgetId, string> = {
  overview: "Overview", pinned: "Pinned items", pinnedFolders: "Pinned folders", favorites: "Favorites", recent: "Recently added",
  weekly: "Saving activity", kinds: "Content types", folders: "Folders", tags: "Popular tags", activity: "Recent activity", domains: "Top sites",
};
const DEFAULT: W[] = [
  { id: "overview", wide: true }, { id: "pinned" }, { id: "recent" }, { id: "favorites" },
  { id: "weekly" }, { id: "kinds" }, { id: "pinnedFolders" }, { id: "folders" }, { id: "tags" }, { id: "domains" }, { id: "activity" },
];

function normalize(saved: unknown): W[] {
  const arr = Array.isArray(saved) ? (saved as W[]).filter((w) => w && TITLES[w.id]) : [];
  const ids = new Set(arr.map((w) => w.id));
  return [...arr, ...DEFAULT.filter((d) => !ids.has(d.id))];
}

function useLayout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["prefs"],
    queryFn: async () => (await supabase.from("user_preferences").select("dashboard").maybeSingle()).data,
  });
  const [layout, setLayout] = useState<W[]>(DEFAULT);
  useEffect(() => { if (data) setLayout(normalize((data.dashboard as { widgets?: unknown })?.widgets)); }, [data]);
  const save = async (next: W[]) => {
    setLayout(next);
    const { error } = await supabase.from("user_preferences").upsert({ user_id: user!.id, dashboard: { widgets: next } as unknown as Json, updated_at: new Date().toISOString() });
    if (error) toast.error("Couldn't save layout");
    qc.setQueryData(["prefs"], { dashboard: { widgets: next } });
  };
  return [layout, save] as const;
}

function Dashboard() {
  const { user } = useAuth();
  const { openAdd } = useAddItem();
  const [layout, save] = useLayout();
  const [editing, setEditing] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const { data: stats } = useQuery(statsQuery);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  const patch = (i: number, p: Partial<W>) => save(layout.map((w, j) => (j === i ? { ...w, ...p } : w)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= layout.length) return;
    const next = [...layout];
    const [w] = next.splice(from, 1);
    next.splice(to, 0, w);
    save(next);
  };

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{greet}{name ? `, ${name}` : ""}.</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openAdd({ mode: "note" })} className="hidden sm:inline-flex"><NotebookPen /> Note</Button>
          <Button variant={editing ? "default" : "outline"} onClick={() => setEditing(!editing)}><SlidersHorizontal /> {editing ? "Done" : "Customize"}</Button>
          <Button onClick={() => openAdd()} className="hidden sm:inline-flex"><Plus /> Add link</Button>
        </div>
      </div>

      {stats && stats.length === 0 && !editing && (
        <div className="mb-6 flex flex-col items-start gap-4 rounded-2xl border bg-gradient-to-br from-accent to-card p-6 sm:flex-row sm:items-center">
          <Sparkles className="size-8 text-primary" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Your vault is ready</h2>
            <p className="text-sm text-muted-foreground">Paste any link — LinkVault fills in the title, description and image for you. Tip: press Ctrl/⌘ V anywhere to save a copied link.</p>
          </div>
          <Button onClick={() => openAdd()}><Plus /> Save your first link</Button>
        </div>
      )}

      {editing && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
          Drag cards, or use the arrows, to rearrange. Hide, collapse or widen any card.
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => save(DEFAULT)}><RotateCcw /> Restore default</Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {layout.map((w, i) => {
          if (w.hidden && !editing) return null;
          return (
            <section
              key={w.id}
              draggable={editing}
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => editing && e.preventDefault()}
              onDrop={() => { if (drag !== null && drag !== i) move(drag, i); setDrag(null); }}
              className={cn(
                "flex min-w-0 flex-col rounded-2xl border bg-card shadow-card",
                w.wide && "lg:col-span-2 2xl:col-span-3",
                w.hidden && "opacity-50",
                editing && "cursor-grab ring-1 ring-dashed ring-border",
                drag === i && "opacity-40",
              )}
            >
              <header className="flex items-center gap-2 px-4 pt-3.5">
                {editing && <GripVertical className="size-4 text-muted-foreground" />}
                <h2 className="flex-1 font-sans text-sm font-medium tracking-normal text-muted-foreground">{TITLES[w.id]}</h2>
                {editing ? (
                  <span className="flex">
                    <IconBtn label="Move up" onClick={() => move(i, i - 1)}><ArrowUp /></IconBtn>
                    <IconBtn label="Move down" onClick={() => move(i, i + 1)}><ArrowDown /></IconBtn>
                    <IconBtn label={w.wide ? "Make narrow" : "Make wide"} onClick={() => patch(i, { wide: !w.wide })}>{w.wide ? <Minimize2 /> : <Maximize2 />}</IconBtn>
                    <IconBtn label={w.hidden ? "Show" : "Hide"} onClick={() => patch(i, { hidden: !w.hidden })}>{w.hidden ? <EyeOff /> : <Eye />}</IconBtn>
                  </span>
                ) : (
                  <IconBtn label={w.collapsed ? "Expand" : "Collapse"} onClick={() => patch(i, { collapsed: !w.collapsed })}>
                    <ChevronDown className={cn("transition-transform", w.collapsed && "-rotate-90")} />
                  </IconBtn>
                )}
              </header>
              {!w.collapsed && <div className="min-w-0 flex-1 p-4 pt-2"><Widget id={w.id} /></div>}
            </section>
          );
        })}
      </div>
    </>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <Button variant="ghost" size="icon" className="size-7" aria-label={label} title={label} onClick={onClick}>{children}</Button>;
}

function Widget({ id }: { id: WidgetId }) {
  switch (id) {
    case "overview": return <Overview />;
    case "pinned": return <ItemList filter={{ pinned: true }} empty="Pin items for quick access." more="/pinned" />;
    case "favorites": return <ItemList filter={{ fav: true }} empty="Star items you love." more="/favorites" />;
    case "recent": return <ItemList filter={{ sort: "new" }} empty="Nothing saved yet." more="/items" />;
    case "weekly": return <Weekly />;
    case "kinds": return <Kinds />;
    case "pinnedFolders": return <FolderList pinnedOnly />;
    case "folders": return <FolderList />;
    case "tags": return <TagCloud />;
    case "activity": return <ActivityFeed />;
    case "domains": return <Domains />;
  }
}

function Overview() {
  const { data } = useQuery(statsQuery);
  const { data: folders } = useFolders();
  const d = data ?? [];
  const weekAgo = Date.now() - 7 * 864e5;
  const tiles = [
    { label: "Total saved", value: d.length, icon: Layers, to: "/items" as const, search: {} },
    { label: "Links", value: d.filter((i) => i.kind === "link" || i.kind === "article").length, icon: Link2, to: "/items" as const, search: { kind: "link" } },
    { label: "Notes", value: d.filter((i) => i.kind === "note").length, icon: NotebookPen, to: "/items" as const, search: { kind: "note" } },
    { label: "Folders", value: folders?.length ?? 0, icon: Folder, to: "/folders" as const, search: {} },
    { label: "Favorites", value: d.filter((i) => i.is_favorite).length, icon: Star, to: "/favorites" as const, search: {} },
    { label: "Pinned", value: d.filter((i) => i.is_pinned).length, icon: Pin, to: "/pinned" as const, search: {} },
    { label: "This week", value: d.filter((i) => Date.parse(i.created_at) > weekAgo).length, icon: Clock, to: "/items" as const, search: { range: "7d" } },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 md:grid-cols-5 xl:grid-cols-7">
      {tiles.map((t) => (
        <Link key={t.label} to={t.to} search={t.search as never} className="group rounded-xl border bg-background p-3 transition hover:border-primary/60 hover:bg-accent">
          <t.icon className="size-4 text-muted-foreground group-hover:text-primary" />
          <p className="mt-3 font-display text-2xl font-semibold">{t.value}</p>
          <p className="text-xs text-muted-foreground">{t.label}</p>
        </Link>
      ))}
    </div>
  );
}

function ItemList({ filter, fallback, empty, more }: { filter: Parameters<typeof itemsQuery>[0]; fallback?: Parameters<typeof itemsQuery>[0]; empty: string; more: string }) {
  const { data } = useQuery(itemsQuery(filter));
  const { data: fb } = useQuery({ ...itemsQuery(fallback ?? {}), enabled: !!fallback && data?.length === 0 });
  const list = (data?.length ? data : fallback ? fb : data) ?? [];
  if (!list.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div>
      <ul className="-mx-2">
        {list.slice(0, 5).map((i) => (
          <li key={i.id}>
            <Link to="/item/$id" params={{ id: i.id }} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
              <Favicon item={i} className="size-4" />
              <span className="min-w-0 flex-1 truncate text-sm">{i.title}</span>
              <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">{i.domain ?? KIND_LABEL[i.kind]}</span>
            </Link>
          </li>
        ))}
      </ul>
      {list.length > 5 && <Link to={more} className="mt-1 block text-xs font-medium text-primary">View all {list.length} →</Link>}
    </div>
  );
}

function Weekly() {
  const { data } = useQuery(statsQuery);
  const navigate = useNavigate();
  const days = useMemo(() => {
    const out = [] as { label: string; count: number }[];
    for (let k = 13; k >= 0; k--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - k);
      const next = d.getTime() + 864e5;
      out.push({ label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), count: (data ?? []).filter((i) => { const t = Date.parse(i.created_at); return t >= d.getTime() && t < next; }).length });
    }
    return out;
  }, [data]);
  const month = (data ?? []).filter((i) => Date.parse(i.created_at) > Date.now() - 30 * 864e5).length;
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground"><span className="font-display text-lg font-semibold text-foreground">{month}</span> saved in the last 30 days · last 14 days shown</p>
      <div className="h-36">
        <ResponsiveContainer>
          <BarChart data={days} onClick={() => navigate({ to: "/items", search: { range: "30d" } })}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={2} />
            <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" name="Saved" fill="var(--primary)" radius={[4, 4, 0, 0]} className="cursor-pointer" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Kinds() {
  const { data } = useQuery(statsQuery);
  const navigate = useNavigate();
  const rows = Object.entries((data ?? []).reduce<Record<string, number>>((a, i) => { const k = i.kind === "article" ? "link" : i.kind; a[k] = (a[k] ?? 0) + 1; return a; }, {}))
    .map(([kind, value]) => ({ kind, name: KIND_LABEL[kind], value })).sort((a, b) => b.value - a.value);
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">No items yet.</p>;
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  return (
    <div className="flex items-center gap-4">
      <div className="size-32 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="value" innerRadius={34} outerRadius={60} paddingAngle={2} stroke="none" onClick={(d) => navigate({ to: "/items", search: { kind: (d as { kind: string }).kind } })} className="cursor-pointer">
              {rows.map((r, i) => <Cell key={r.kind} fill={colors[i % colors.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-1 text-sm">
        {rows.map((r, i) => (
          <li key={r.kind}>
            <Link to="/items" search={{ kind: r.kind }} className="flex items-center gap-2 rounded px-1 hover:bg-muted">
              <span className="size-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
              <span className="flex-1">{r.name}</span><span className="font-mono text-xs text-muted-foreground">{r.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FolderList({ pinnedOnly }: { pinnedOnly?: boolean }) {
  const { data: folders } = useFolders();
  const { data } = useQuery(statsQuery);
  const list = (folders ?? []).filter((f) => !pinnedOnly || f.is_pinned);
  if (!list.length) return <p className="py-6 text-center text-sm text-muted-foreground">{pinnedOnly ? "Pin folders from the Folders page." : <>No folders yet. <Link to="/folders" search={{ new: "1" }} className="text-primary">Create one</Link></>}</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {list.slice(0, 8).map((f) => (
        <Link key={f.id} to="/folders/$id" params={{ id: f.id }} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm hover:border-primary/60">
          <Folder className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{(data ?? []).filter((i) => i.folder_id === f.id).length}</span>
        </Link>
      ))}
    </div>
  );
}

function TagCloud() {
  const { data } = useTags();
  const tags = [...(data ?? [])].sort((a, b) => (b.item_tags[0]?.count ?? 0) - (a.item_tags[0]?.count ?? 0)).slice(0, 16);
  if (!tags.length) return <p className="py-6 text-center text-sm text-muted-foreground">Tags you add will appear here.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <Link key={t.id} to="/items" search={{ tag: t.id }} className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 font-mono text-xs hover:border-primary/60">
          <Hash className="size-3" />{t.name}<span className="text-muted-foreground">{t.item_tags[0]?.count ?? 0}</span>
        </Link>
      ))}
    </div>
  );
}

function Domains() {
  const { data } = useQuery(statsQuery);
  const rows = Object.entries((data ?? []).reduce<Record<string, number>>((a, i) => { if (i.domain) a[i.domain] = (a[i.domain] ?? 0) + 1; return a; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">No links yet.</p>;
  const max = rows[0][1];
  return (
    <ul className="space-y-1.5">
      {rows.map(([d, n]) => (
        <li key={d}>
          <Link to="/items" search={{ domain: d }} className="block rounded px-1 hover:bg-muted">
            <div className="flex items-center gap-2 text-sm"><Favicon item={{ domain: d, favicon_url: null, kind: "link" }} className="size-4" /><span className="flex-1 truncate">{d}</span><span className="font-mono text-xs text-muted-foreground">{n}</span></div>
            <div className="mt-1 h-1 rounded-full bg-muted"><div className="h-1 rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ActivityFeed() {
  const { data } = useQuery(activityQuery);
  if (!data?.length) return <p className="py-6 text-center text-sm text-muted-foreground"><Activity className="mx-auto mb-2 size-5" />Your activity will show here.</p>;
  const label = (a: string) => ({ added: "Saved", edited: "Edited", trashed: "Moved to Trash", restored: "Restored", favorited: "Favorited", unfavorited: "Unfavorited", pinned: "Pinned", unpinned: "Unpinned", moved: "Moved", processed: "Organized" } as Record<string, string>)[a] ?? a;
  return (
    <ol className="space-y-0.5">
      {data.slice(0, 8).map((a) => {
        const it = a.items as { id: string; title: string } | null;
        return (
          <li key={a.id} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 font-mono text-[10px] uppercase text-muted-foreground">{label(a.action)}</span>
            {it ? <Link to="/item/$id" params={{ id: it.id }} className="min-w-0 flex-1 truncate rounded px-1 py-1 hover:bg-muted">{it.title}</Link> : <span className="flex-1 text-muted-foreground">Deleted item</span>}
            <time className="shrink-0 font-mono text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
          </li>
        );
      })}
    </ol>
  );
}
