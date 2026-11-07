import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { ItemsView } from "@/components/items/ItemsView";
import { PageHeader } from "@/components/shell/AppShell";
import { parseFilter } from "@/lib/filter-search";

export const Route = createFileRoute("/_authenticated/favorites")({
  validateSearch: parseFilter,
  head: () => ({
    meta: [
      { title: "Favorites — LinkVault" },
      { name: "description", content: "Things you love." },
      { property: "og:title", content: "Favorites — LinkVault" },
      { property: "og:description", content: "Things you love." },
    ],
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <PageHeader title="Favorites" description="Things you love." icon={Star} />
      <ItemsView
        fixed={{ fav: true }}
        hideFilters={[]}
        filter={search}
        onChange={(f) => navigate({ search: f, replace: true })}
        empty={{ icon: <Star />, title: "No favorites yet", body: "Star an item, or swipe right on it, to add it here." }}
      />
    </>
  );
}
