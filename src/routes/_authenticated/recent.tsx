import { createFileRoute } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { ItemsView } from "@/components/items/ItemsView";
import { PageHeader } from "@/components/shell/AppShell";
import { parseFilter } from "@/lib/filter-search";

export const Route = createFileRoute("/_authenticated/recent")({
  validateSearch: parseFilter,
  head: () => ({
    meta: [
      { title: "Recently Viewed — LinkVault" },
      { name: "description", content: "What you opened lately." },
      { property: "og:title", content: "Recently Viewed — LinkVault" },
      { property: "og:description", content: "What you opened lately." },
    ],
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <PageHeader title="Recently Viewed" description="What you opened lately." icon={Eye} />
      <ItemsView
        fixed={{ sort: "viewed" as const }}
        hideFilters={[]}
        filter={search}
        onChange={(f) => navigate({ search: f, replace: true })}
        empty={{ icon: <Eye />, title: "Nothing opened yet", body: "Items you open will show up here." }}
      />
    </>
  );
}
