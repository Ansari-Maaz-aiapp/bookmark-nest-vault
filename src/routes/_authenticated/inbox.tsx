import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { ItemsView } from "@/components/items/ItemsView";
import { PageHeader } from "@/components/shell/AppShell";
import { parseFilter } from "@/lib/filter-search";

export const Route = createFileRoute("/_authenticated/inbox")({
  validateSearch: parseFilter,
  head: () => ({
    meta: [
      { title: "Inbox — LinkVault" },
      { name: "description", content: "Saved but not yet organized." },
      { property: "og:title", content: "Inbox — LinkVault" },
      { property: "og:description", content: "Saved but not yet organized." },
    ],
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <PageHeader title="Inbox" description="Saved but not yet organized." icon={Inbox} />
      <ItemsView
        fixed={{ inbox: true }}
        hideFilters={["folder"]}
        filter={search}
        onChange={(f) => navigate({ search: f, replace: true })}
        empty={{ icon: <Inbox />, title: "Inbox zero", body: "New items without a folder land here." }}
      />
    </>
  );
}
