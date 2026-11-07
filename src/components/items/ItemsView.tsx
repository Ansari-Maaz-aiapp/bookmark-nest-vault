import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LayoutGrid, List, Rows3, Search, X, Plus, Loader2 } from "lucide-react";
import { itemsQuery, KIND_LABEL, useFolders, useTags, type ItemFilter } from "@/lib/vault";
import { ItemGrid, EmptyState, type ViewMode } from "./ItemCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAddItem } from "./AddItemProvider";

export function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const [v, setV] = useState<ViewMode>("grid");
  useEffect(() => setV((localStorage.getItem("lv-view") as ViewMode) || "grid"), []);
  return [v, (n) => { localStorage.setItem("lv-view", n); setV(n); }];
}

const ALL = "__all";

/**
 * Library view with combined filters. `fixed` filters come from the page (e.g. Favorites)
 * and `filter`/`onChange` hold user-adjustable ones (usually mirrored in the URL).
 */
export function ItemsView({
  fixed = {}, filter, onChange, empty, hideFilters = [],
}: {
  fixed?: ItemFilter;
  filter: ItemFilter;
  onChange: (f: ItemFilter) => void;
  empty: { icon: React.ReactNode; title: string; body: string };
  hideFilters?: ("kind" | "folder" | "tag" | "status" | "range")[];
}) {
  const [view, setView] = useViewMode();
  const [q, setQ] = useState(filter.q ?? "");
  const { data: folders } = useFolders();
  const { data: tags } = useTags();
  const { openAdd } = useAddItem();
  const merged = { ...filter, ...fixed };
  const { data, isLoading, error } = useQuery(itemsQuery(merged));

  useEffect(() => {
    const t = setTimeout(() => { if ((filter.q ?? "") !== q) onChange({ ...filter, q: q || undefined }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const set = (k: keyof ItemFilter, v: string) => onChange({ ...filter, [k]: v === ALL ? undefined : v });
  const active = (["kind", "folder", "tag", "status", "range", "q", "domain"] as const).filter((k) => filter[k]);

  return (
    <div>
      <div className="mb-5 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, links, notes…" className="h-10 pl-9" aria-label="Search within results" />
          </div>
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)} variant="outline" className="hidden sm:flex">
            <ToggleGroupItem value="grid" aria-label="Grid view"><LayoutGrid /></ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view"><List /></ToggleGroupItem>
            <ToggleGroupItem value="compact" aria-label="Compact view"><Rows3 /></ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
          {!hideFilters.includes("kind") && (
            <FilterSelect label="Type" value={filter.kind} onChange={(v) => set("kind", v)} options={Object.entries(KIND_LABEL).filter(([k]) => k !== "article").map(([k, l]) => [k, l])} />
          )}
          {!hideFilters.includes("folder") && (
            <FilterSelect label="Folder" value={filter.folder} onChange={(v) => set("folder", v)} options={[["none", "No folder"], ...(folders ?? []).map((f) => [f.id, f.name] as [string, string])]} />
          )}
          {!hideFilters.includes("tag") && (
            <FilterSelect label="Tag" value={filter.tag} onChange={(v) => set("tag", v)} options={(tags ?? []).map((t) => [t.id, `#${t.name}`])} />
          )}
          {!hideFilters.includes("status") && (
            <FilterSelect label="Reading" value={filter.status} onChange={(v) => set("status", v)} options={[["unread", "Unread"], ["reading", "Reading"], ["completed", "Completed"]]} />
          )}
          {!hideFilters.includes("range") && (
            <FilterSelect label="Added" value={filter.range} onChange={(v) => set("range", v)} options={[["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"]]} />
          )}
          <Select value={filter.sort ?? "new"} onValueChange={(v) => set("sort", v === "new" ? ALL : v)}>
            <SelectTrigger className="h-9 w-auto shrink-0 gap-1.5 text-sm" aria-label="Sort"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Newest first</SelectItem>
              <SelectItem value="old">Oldest first</SelectItem>
              <SelectItem value="az">A → Z</SelectItem>
              <SelectItem value="viewed">Recently opened</SelectItem>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="popular">Most opened</SelectItem>
            </SelectContent>
          </Select>
          {active.length > 0 && (
            <Button variant="ghost" size="sm" className="h-9 shrink-0" onClick={() => { setQ(""); onChange({}); }}>
              <X /> Clear all
            </Button>
          )}
        </div>
        {filter.domain && (
          <p className="text-sm text-muted-foreground">Showing items from <span className="font-medium text-foreground">{filter.domain}</span></p>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <p className="text-sm text-destructive">Couldn't load items: {(error as Error).message}</p>
      ) : data && data.length ? (
        <>
          <p className="mb-3 font-mono text-xs text-muted-foreground">{data.length} item{data.length === 1 ? "" : "s"}</p>
          <ItemGrid items={data} view={view} />
        </>
      ) : (
        <EmptyState
          {...(active.length ? { icon: <Search />, title: "No matches", body: "Try removing a filter or searching for something else." } : empty)}
          action={!active.length && !fixed.trash ? <Button onClick={() => openAdd({ folderId: fixed.folder })}><Plus /> Add item</Button> : undefined}
        />
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value?: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value ?? ALL} onValueChange={onChange}>
      <SelectTrigger className={`h-9 w-auto shrink-0 gap-1.5 text-sm ${value ? "border-primary/50 bg-accent text-accent-foreground" : ""}`} aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Any {label.toLowerCase()}</SelectItem>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
