import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Folder, FolderPlus, Pin, PinOff, Trash2, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/items/ItemCard";
import { statsQuery, useFolders, useInvalidateVault, type Folder as F } from "@/lib/vault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/folders/")({
  validateSearch: (s: Record<string, unknown>): { new?: string } => ({ new: s.new ? String(s.new) : undefined }),
  head: () => ({
    meta: [
      { title: "Folders — LinkVault" },
      { name: "description", content: "Organize your vault into folders." },
      { property: "og:title", content: "Folders — LinkVault" },
      { property: "og:description", content: "Organize your vault into folders." },
    ],
  }),
  component: Page,
});

export function FolderDialog({ open, onOpenChange, folder, parentId }: { open: boolean; onOpenChange: (o: boolean) => void; folder?: F | null; parentId?: string }) {
  const { data: folders } = useFolders();
  const invalidate = useInvalidateVault();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [parent, setParent] = useState("none");
  useEffect(() => {
    if (!open) return;
    setName(folder?.name ?? "");
    setDesc(folder?.description ?? "");
    setParent(folder?.parent_id ?? parentId ?? "none");
  }, [open, folder, parentId]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const row = { name: name.trim(), description: desc.trim() || null, parent_id: parent === "none" ? null : parent };
    const { error } = folder ? await supabase.from("folders").update(row).eq("id", folder.id) : await supabase.from("folders").insert({ ...row, position: folders?.length ?? 0 });
    if (error) return toast.error(error.message);
    toast.success(folder ? "Folder updated" : "Folder created");
    invalidate();
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={save} className="space-y-4">
          <DialogHeader><DialogTitle>{folder ? "Edit folder" : "New folder"}</DialogTitle></DialogHeader>
          <div className="space-y-1.5"><Label htmlFor="fname">Name</Label><Input id="fname" autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="fdesc">Description</Label><Textarea id="fdesc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Inside</Label>
            <Select value={parent} onValueChange={setParent}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Top level</SelectItem>
                {folders?.filter((f) => f.id !== folder?.id).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="submit">Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: folders } = useFolders();
  const { data: stats } = useQuery(statsQuery);
  const invalidate = useInvalidateVault();
  const [open, setOpen] = useState(!!search.new);
  const [editing, setEditing] = useState<F | null>(null);
  useEffect(() => { if (search.new) { setEditing(null); setOpen(true); navigate({ search: {}, replace: true }); } }, [search.new, navigate]);

  const count = (id: string) => stats?.filter((i) => i.folder_id === id).length ?? 0;
  const top = (folders ?? []).filter((f) => !f.parent_id);
  const children = (id: string) => (folders ?? []).filter((f) => f.parent_id === id);

  async function move(f: F, dir: -1 | 1) {
    const list = top;
    const idx = list.findIndex((x) => x.id === f.id);
    const other = list[idx + dir];
    if (!other) return;
    await Promise.all(list.map((x, i) => {
      const pos = x.id === f.id ? idx + dir : x.id === other.id ? idx : i;
      return supabase.from("folders").update({ position: pos }).eq("id", x.id);
    }));
    invalidate();
  }

  const row = (f: F, nested = false) => (
    <div key={f.id} className={nested ? "ml-6" : ""}>
      <div className="flex items-center gap-2 rounded-xl border bg-card p-1.5 pl-3 shadow-card">
        <Folder className="size-5 shrink-0 text-primary" />
        <Link to="/folders/$id" params={{ id: f.id }} className="min-w-0 flex-1 py-2 hover:text-primary">
          <span className="block truncate font-medium">{f.name}</span>
          {f.description && <span className="block truncate text-xs text-muted-foreground">{f.description}</span>}
        </Link>
        <span className="font-mono text-xs text-muted-foreground">{count(f.id)}</span>
        {!nested && (
          <span className="hidden sm:flex">
            <Button variant="ghost" size="icon" className="size-8" aria-label="Move up" onClick={() => move(f, -1)}><ArrowUp /></Button>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Move down" onClick={() => move(f, 1)}><ArrowDown /></Button>
          </span>
        )}
        <Button variant="ghost" size="icon" className="size-8" aria-label={f.is_pinned ? "Unpin folder" : "Pin folder"}
          onClick={async () => { await supabase.from("folders").update({ is_pinned: !f.is_pinned, pin_order: Date.now() % 1e9 }).eq("id", f.id); invalidate(); }}>
          {f.is_pinned ? <PinOff className="text-pin" /> : <Pin />}
        </Button>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Edit folder" onClick={() => { setEditing(f); setOpen(true); }}><Pencil /></Button>
        <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Delete folder"
          onClick={async () => {
            if (!window.confirm(`Delete folder “${f.name}”? Items inside are kept and move back to no folder.`)) return;
            await supabase.from("folders").delete().eq("id", f.id);
            invalidate();
          }}><Trash2 /></Button>
      </div>
      <div className="mt-2 space-y-2">{children(f.id).map((c) => row(c, true))}</div>
    </div>
  );

  return (
    <>
      <PageHeader title="Folders" description="Organize your vault. Pin folders to keep them in the sidebar." icon={Folder}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><FolderPlus /> New folder</Button>} />
      {folders && folders.length === 0 ? (
        <EmptyState icon={<Folder />} title="No folders yet" body="Create a folder to group related items." action={<Button onClick={() => setOpen(true)}><FolderPlus /> New folder</Button>} />
      ) : (
        <div className="max-w-3xl space-y-2">{top.map((f) => row(f))}</div>
      )}
      <FolderDialog open={open} onOpenChange={setOpen} folder={editing} />
    </>
  );
}
