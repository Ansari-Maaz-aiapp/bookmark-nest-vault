import { createFileRoute } from "@tanstack/react-router";
import { Download, Monitor, Moon, Settings, Sun, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateVault } from "@/lib/vault";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LinkVault" },
      { name: "description", content: "Appearance, export and data settings." },
      { property: "og:title", content: "Settings — LinkVault" },
      { property: "og:description", content: "Appearance, export and data settings." },
    ],
  }),
  component: Page,
});

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Page() {
  const { user } = useAuth();
  const { mode, setMode } = useTheme();
  const invalidate = useInvalidateVault();

  async function exportAs(fmt: "json" | "csv" | "md") {
    const { data: items } = await supabase.from("items").select("*, item_tags(tags(name)), folders(name)").is("deleted_at", null);
    const rows = (items ?? []).map((i) => ({
      title: i.title, url: i.url, kind: i.kind, description: i.description, content: i.content,
      folder: (i.folders as { name: string } | null)?.name ?? "", tags: (i.item_tags as { tags: { name: string } | null }[]).map((t) => t.tags?.name).join(", "),
      favorite: i.is_favorite, pinned: i.is_pinned, reading_status: i.reading_status, saved: i.created_at,
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    if (fmt === "json") download(`linkvault-${stamp}.json`, JSON.stringify(rows, null, 2), "application/json");
    else if (fmt === "csv") {
      const cols = Object.keys(rows[0] ?? { title: "" });
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      download(`linkvault-${stamp}.csv`, [cols.join(","), ...rows.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(","))].join("\n"), "text/csv");
    } else {
      const md = `# LinkVault export — ${stamp}\n\n` + rows.map((r) => `- [${r.title}](${r.url ?? ""})${r.folder ? ` · ${r.folder}` : ""}${r.tags ? ` · ${r.tags.split(", ").map((t) => "#" + t).join(" ")}` : ""}${r.description ? `\n  ${r.description}` : ""}`).join("\n");
      download(`linkvault-${stamp}.md`, md, "text/markdown");
    }
    toast.success(`Exported ${rows.length} items`);
  }

  return (
    <>
      <PageHeader title="Settings" icon={Settings} />
      <div className="max-w-2xl space-y-5">
        <Section title="Profile">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="font-medium">{user?.email}</p>
        </Section>
        <Section title="Appearance">
          <div className="grid grid-cols-3 gap-2">
            {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]] as const).map(([m, Icon, l]) => (
              <button key={m} onClick={() => setMode(m)} className={cn("flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition", mode === m ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted")} aria-pressed={mode === m}>
                <Icon className="size-5" /> {l}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Export">
          <p className="mb-3 text-sm text-muted-foreground">Download everything in your vault.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportAs("json")}><Download /> JSON</Button>
            <Button variant="outline" onClick={() => exportAs("csv")}><Download /> CSV</Button>
            <Button variant="outline" onClick={() => exportAs("md")}><Download /> Markdown</Button>
          </div>
        </Section>
        <Section title="Data">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={async () => {
              if (!window.confirm("Permanently delete everything in Trash?")) return;
              const { error } = await supabase.from("items").delete().not("deleted_at", "is", null);
              if (error) toast.error(error.message); else toast.success("Trash emptied");
              invalidate();
            }}><Trash2 /> Empty Trash</Button>
            <Button variant="destructive" onClick={async () => {
              if (window.prompt('This deletes ALL your items, folders and tags. Type "DELETE" to confirm.') !== "DELETE") return;
              await supabase.from("items").delete().not("id", "is", null);
              await supabase.from("folders").delete().not("id", "is", null);
              await supabase.from("tags").delete().not("id", "is", null);
              await supabase.from("activity_logs").delete().not("id", "is", null);
              toast.success("All data deleted");
              invalidate();
            }}><Trash2 /> Delete all data</Button>
          </div>
        </Section>
      </div>
    </>
  );
}
