import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ItemsView } from "@/components/items/ItemsView";
import { PageHeader } from "@/components/shell/AppShell";
import { parseFilter } from "@/lib/filter-search";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/reading")({
  validateSearch: parseFilter,
  head: () => ({
    meta: [
      { title: "Reading Queue — LinkVault" },
      { name: "description", content: "Things to read, in progress and done." },
      { property: "og:title", content: "Reading Queue — LinkVault" },
      { property: "og:description", content: "Things to read, in progress and done." },
    ],
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const status = search.status ?? "unread";
  return (
    <>
      <PageHeader title="Reading Queue" description="Things to read, in progress and done." icon={BookOpen} />
      <Tabs value={status} onValueChange={(v) => navigate({ search: { ...search, status: v }, replace: true })} className="mb-4">
        <TabsList>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="reading">Reading</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>
      <ItemsView
        fixed={{ status }}
        hideFilters={["status"]}
        filter={search}
        onChange={(f) => navigate({ search: { ...f, status: search.status }, replace: true })}
        empty={{ icon: <BookOpen />, title: `Nothing ${status === "completed" ? "completed" : status}`, body: "Add items to your queue from the Add dialog or an item's menu." }}
      />
    </>
  );
}
