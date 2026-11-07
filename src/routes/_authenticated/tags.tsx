import { createFileRoute, Link } from "@tanstack/react-router";
import { Hash, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/items/ItemCard";
import { useInvalidateVault, useTags } from "@/lib/vault";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/tags")({
  head: () => ({
    meta: [
      { title: "Tags — LinkVault" },
      { name: "description", content: "Browse your vault by tag." },
      { property: "og:title", content: "Tags — LinkVault" },
      { property: "og:description", content: "Browse your vault by tag." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data } = useTags();
  const invalidate = useInvalidateVault();
  return (
    <>
      <PageHeader title="Tags" description="Browse your vault by tag." icon={Hash} />
      {data && data.length === 0 ? (
        <EmptyState icon={<Hash />} title="No tags yet" body="Add tags when saving or editing an item." />
      ) : (
        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {data?.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-xl border bg-card p-1 pl-4 shadow-card">
              <Link to="/items" search={{ tag: t.id }} className="flex flex-1 items-center justify-between py-2.5 font-medium hover:text-primary">
                <span>#{t.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{t.item_tags[0]?.count ?? 0}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete tag ${t.name}`}
                onClick={async () => {
                  if (!window.confirm(`Delete #${t.name}? Items keep everything else.`)) return;
                  await supabase.from("tags").delete().eq("id", t.id);
                  invalidate();
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
