import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { ItemsView } from "@/components/items/ItemsView";
import { PageHeader } from "@/components/shell/AppShell";
import { parseFilter } from "@/lib/filter-search";

export const Route = createFileRoute("/_authenticated/trash")({
  validateSearch: parseFilter,
  head: () => ({
    meta: [
      { title: "Trash — LinkVault" },
      { name: "description", content: "Items you removed. Restore them any time." },
      { property: "og:title", content: "Trash — LinkVault" },
      { property: "og:description", content: "Items you removed. Restore them any time." },
    ],
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <PageHeader title="Trash" description="Items you removed. Restore them any time." icon={Trash2} />
      <ItemsView
        fixed={{ trash: true }}
        hideFilters={[]}
        filter={search}
        onChange={(f) => navigate({ search: f, replace: true })}
        empty={{ icon: <Trash2 />, title: "Trash is empty", body: "Deleted items stay here until you remove them for good." }}
      />
    </>
  );
}
