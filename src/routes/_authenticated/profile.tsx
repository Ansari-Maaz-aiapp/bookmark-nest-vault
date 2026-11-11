import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, LogOut, Settings, Trash2, UserRound } from "lucide-react";
import { PageHeader, ThemeToggle } from "@/components/shell/AppShell";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — LinkVault" },
      { name: "description", content: "Your LinkVault profile and account details." },
      { property: "og:title", content: "Profile — LinkVault" },
      { property: "og:description", content: "Your LinkVault profile and account details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <>
      <PageHeader title="Profile" description="How you appear in LinkVault, and your account." icon={UserRound} />
      <div className="max-w-2xl space-y-5">
        <section className="rounded-2xl border bg-card p-5 shadow-card">
          <ProfileSection />
        </section>
        <section className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
          <div className="flex items-center gap-3 px-5 py-3.5 text-sm">
            <span className="flex-1 font-medium">Light / dark theme</span>
            <ThemeToggle />
          </div>
          <Link to="/settings" className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-muted">
            <Settings className="size-4 text-muted-foreground" /> <span className="flex-1 font-medium">Settings & export</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <Link to="/trash" className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-muted">
            <Trash2 className="size-4 text-muted-foreground" /> <span className="flex-1 font-medium">Trash</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <button
            className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm text-destructive hover:bg-muted"
            onClick={async () => {
              await qc.cancelQueries();
              qc.clear();
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut className="size-4" /> <span className="flex-1 font-medium">Sign out</span>
          </button>
        </section>
      </div>
    </>
  );
}
