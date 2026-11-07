import { createFileRoute } from "@tanstack/react-router";
import { Pin } from "lucide-react";
import { ItemsView } from "@/components/items/ItemsView";
import { PageHeader } from "@/components/shell/AppShell";
import { parseFilter } from "@/lib/filter-search";

export const Route = createFileRoute("/_authenticated/pinned")({
  validateSearch: parseFilter,
  head: () => ({
    meta: [
      { title: "Pinned — LinkVault" },
      { name: "description", content: "Kept within reach." },
      { property: "og:title", content: "Pinned — LinkVault" },
      { property: "og:description", content: "Kept within reach." },
    ],
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <PageHeader title="Pinned" description="Kept within reach." icon={Pin} />
      <ItemsView
        fixed={{ pinned: true }}
        hideFilters={[]}
        filter={search}
        onChange={(f) => navigate({ search: f, replace: true })}
        empty={{ icon: <Pin />, title: "Nothing pinned", body: "Pin items you want immediate access to." }}
      />
    </>
  );
}
