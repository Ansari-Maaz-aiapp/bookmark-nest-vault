import { createFileRoute } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { ItemsView } from "@/components/items/ItemsView";
import { PageHeader } from "@/components/shell/AppShell";
import { parseFilter } from "@/lib/filter-search";

export const Route = createFileRoute("/_authenticated/items")({
  validateSearch: parseFilter,
  head: () => ({
    meta: [
      { title: "All Items — LinkVault" },
      { name: "description", content: "Everything in your vault." },
      { property: "og:title", content: "All Items — LinkVault" },
      { property: "og:description", content: "Everything in your vault." },
    ],
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <PageHeader title="All Items" description="Everything in your vault." icon={Layers} />
      <ItemsView
        fixed={{}}
        hideFilters={[]}
        filter={search}
        onChange={(f) => navigate({ search: f, replace: true })}
        empty={{ icon: <Layers />, title: "Your vault is empty", body: "Save your first link or note to get started." }}
      />
    </>
  );
}
