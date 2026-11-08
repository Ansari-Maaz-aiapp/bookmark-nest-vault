import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Folder, FolderPlus, Pin, PinOff, ChevronLeft } from "lucide-react";
import { ItemsView } from "@/components/items/ItemsView";
import { PageHeader } from "@/components/shell/AppShell";
import { parseFilter } from "@/lib/filter-search";
import { useFolders, useInvalidateVault } from "@/lib/vault";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FolderDialog } from "./folders.index";

export const Route = createFileRoute("/_authenticated/folders/$id")({
  validateSearch: parseFilter,
  head: () => ({
    meta: [
      { title: "Folder — LinkVault" },
      { name: "description", content: "Items in this folder." },
      { property: "og:title", content: "Folder — LinkVault" },
      { property: "og:description", content: "Items in this folder." },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: folders } = useFolders();
  const invalidate = useInvalidateVault();
  const [sub, setSub] = useState(false);
  const folder = folders?.find((f) => f.id === id);
  const kids = folders?.filter((f) => f.parent_id === id) ?? [];
  return (
    <>
      <Link to="/folders" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Folders</Link>
      <PageHeader title={folder?.name ?? "Folder"} description={folder?.description ?? undefined} icon={Folder}
        actions={folder && (
          <>
            <Button variant="outline" onClick={() => setSub(true)}><FolderPlus /> Subfolder</Button>
            <Button variant="outline" onClick={async () => { await supabase.from("folders").update({ is_pinned: !folder.is_pinned, pin_order: Date.now() % 1e9 }).eq("id", folder.id); invalidate(); }}>
              {folder.is_pinned ? <PinOff /> : <Pin />} {folder.is_pinned ? "Unpin" : "Pin"}
            </Button>
          </>
        )} />
      {kids.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {kids.map((k) => (
            <Link key={k.id} to="/folders/$id" params={{ id: k.id }} className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:border-primary">
              <Folder className="size-4 text-primary" /> {k.name}
            </Link>
          ))}
        </div>
      )}
      <ItemsView fixed={{ folder: id }} hideFilters={["folder"]} filter={search} onChange={(f) => navigate({ search: f, replace: true })}
        empty={{ icon: <Folder />, title: "This folder is empty", body: "Move items here from their menu, or add a new one." }} />
      <FolderDialog open={sub} onOpenChange={setSub} parentId={id} />
    </>
  );
}
