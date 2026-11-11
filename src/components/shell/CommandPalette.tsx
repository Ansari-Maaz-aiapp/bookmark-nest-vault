import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Folder, FolderPlus, Hash, Home, Layers, Link2, Monitor, Moon, NotebookPen, Pin, Settings, Star, Sun, Trash2, UserRound } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { itemsQuery, useFolders } from "@/lib/vault";
import { useAddItem } from "@/components/items/AddItemProvider";
import { useTheme } from "@/hooks/use-theme";
import { Favicon } from "@/components/items/ItemVisual";

const RECENT_KEY = "lv-recent-searches";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const { openAdd } = useAddItem();
  const { setMode } = useTheme();
  const { data: folders } = useFolders();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (open) setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"));
    else setQ("");
  }, [open]);

  const { data: results } = useQuery({ ...itemsQuery({ q: debounced }), enabled: open && debounced.length > 1 });

  const run = (fn: () => void) => {
    if (debounced.length > 1) {
      const next = [debounced, ...recent.filter((r) => r !== debounced)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    }
    onOpenChange(false);
    fn();
  };
  const go = (to: string) => run(() => navigate({ to }));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search your vault or type a command…" value={q} onValueChange={setQ} />
      <CommandList className="max-h-[60dvh]">
        <CommandEmpty>Nothing found.</CommandEmpty>
        {!q && recent.length > 0 && (
          <CommandGroup heading="Recent searches">
            {recent.map((r) => (
              <CommandItem key={r} value={`recent ${r}`} onSelect={() => setQ(r)}>
                {r}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results && results.length > 0 && (
          <CommandGroup heading="Items">
            {results.slice(0, 8).map((i) => (
              <CommandItem key={i.id} value={`item ${i.id} ${i.title} ${i.url ?? ""} ${debounced}`} onSelect={() => go(`/item/${i.id}`)}>
                <Favicon item={i} className="size-4" />
                <span className="truncate">{i.title}</span>
                <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">{i.domain}</span>
              </CommandItem>
            ))}
            <CommandItem value={`all results ${debounced}`} onSelect={() => run(() => navigate({ to: "/items", search: { q: debounced } }))}>
              <Layers /> See all results for “{debounced}”
            </CommandItem>
          </CommandGroup>
        )}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => openAdd())}><Link2 /> Add a link</CommandItem>
          <CommandItem onSelect={() => run(() => openAdd({ mode: "note" }))}><NotebookPen /> New note</CommandItem>
          <CommandItem onSelect={() => go("/folders?new=1")}><FolderPlus /> Create folder</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => go("/")}><Home /> Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/items")}><Layers /> All Items</CommandItem>
          <CommandItem onSelect={() => go("/favorites")}><Star /> Favorites</CommandItem>
          <CommandItem onSelect={() => go("/pinned")}><Pin /> Pinned</CommandItem>
          <CommandItem onSelect={() => go("/tags")}><Hash /> Tags</CommandItem>
          <CommandItem onSelect={() => go("/trash")}><Trash2 /> Trash</CommandItem>
          <CommandItem onSelect={() => go("/profile")}><UserRound /> Profile</CommandItem>
          <CommandItem onSelect={() => go("/settings")}><Settings /> Settings</CommandItem>
        </CommandGroup>
        {folders && folders.length > 0 && (
          <CommandGroup heading="Folders">
            {folders.map((f) => (
              <CommandItem key={f.id} value={`folder ${f.name}`} onSelect={() => go(`/folders/${f.id}`)}>
                <Folder /> {f.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => run(() => setMode("light"))}><Sun /> Light</CommandItem>
          <CommandItem onSelect={() => run(() => setMode("dark"))}><Moon /> Dark</CommandItem>
          <CommandItem onSelect={() => run(() => setMode("system"))}><Monitor /> System</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
