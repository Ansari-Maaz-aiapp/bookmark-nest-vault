import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronsLeft, ChevronsRight, Clock, Eye, Folder, Hash, Home, Layers, LogOut, Menu, Monitor, Moon,
  Pin, Plus, Search, Settings, Star, Sun, Trash2, UserRound,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { statsQuery, useFolders } from "@/lib/vault";
import { useProfile } from "@/lib/profile";
import { AddItemProvider, useAddItem } from "@/components/items/AddItemProvider";
import { CommandPalette } from "./CommandPalette";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; icon: typeof Home; search?: Record<string, string>; count?: number; exact?: boolean };

function useCounts() {
  const { data } = useQuery(statsQuery);
  const items = data ?? [];
  return {
    all: items.length,
    fav: items.filter((i) => i.is_favorite).length,
    pinned: items.filter((i) => i.is_pinned).length,
  };
}

function useSections(): { title: string; items: NavItem[] }[] {
  const c = useCounts();
  return [
    {
      title: "Vault",
      items: [
        { to: "/", label: "Dashboard", icon: Home, exact: true },
        { to: "/items", label: "All Items", icon: Layers, count: c.all, exact: true },
        { to: "/favorites", label: "Favorites", icon: Star, count: c.fav },
        { to: "/pinned", label: "Pinned", icon: Pin, count: c.pinned },
        { to: "/recent", label: "Recently Viewed", icon: Eye },
      ],
    },
    {
      title: "Organize",
      items: [
        { to: "/folders", label: "Folders", icon: Folder },
        { to: "/tags", label: "Tags", icon: Hash },
      ],
    },
    {
      title: "Other",
      items: [
        { to: "/profile", label: "Profile", icon: UserRound },
        { to: "/trash", label: "Trash", icon: Trash2 },
        { to: "/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

function isActive(path: string, item: NavItem) {
  return item.exact ? path === item.to : path === item.to || path.startsWith(item.to + "/");
}

function NavLink({ item, collapsed, path, onNavigate }: { item: NavItem; collapsed?: boolean; path: string; onNavigate?: () => void }) {
  const active = isActive(path, item);
  const link = (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
        active && "bg-sidebar-accent font-medium text-sidebar-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active && <span className="absolute -left-3 top-1.5 h-6 w-1 rounded-r-full bg-sidebar-primary" aria-hidden />}
      <item.icon className={cn("size-[18px] shrink-0", active && "text-sidebar-primary")} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && !!item.count && <span className="font-mono text-[11px] text-muted-foreground">{item.count}</span>}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.label}
        {item.count ? ` · ${item.count}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

function PinnedFolders({ collapsed, path, onNavigate }: { collapsed?: boolean; path: string; onNavigate?: () => void }) {
  const { data } = useFolders();
  const pinned = (data ?? []).filter((f) => f.is_pinned).sort((a, b) => a.pin_order - b.pin_order);
  if (!pinned.length) return null;
  return (
    <div className="space-y-0.5">
      {!collapsed && <p className="px-2.5 pb-1 pt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pinned folders</p>}
      {collapsed && <div className="my-3 h-px bg-sidebar-border" />}
      {pinned.map((f) => (
        <NavLink key={f.id} path={path} collapsed={collapsed} onNavigate={onNavigate} item={{ to: `/folders/${f.id}`, label: f.name, icon: Folder }} />
      ))}
    </div>
  );
}

function SidebarBody({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const sections = useSections();
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 scrollbar-none" aria-label="Main">
      {sections.map((s) => (
        <div key={s.title} className="space-y-0.5">
          {!collapsed ? (
            <p className="px-2.5 pb-1 pt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.title}</p>
          ) : (
            <div className="my-3 h-px bg-sidebar-border" />
          )}
          {s.items.map((i) => <NavLink key={i.to} item={i} collapsed={collapsed} path={path} onNavigate={onNavigate} />)}
          {s.title === "Organize" && <PinnedFolders collapsed={collapsed} path={path} onNavigate={onNavigate} />}
        </div>
      ))}
    </nav>
  );
}

export function ThemeMenuItems() {
  const { mode, setMode } = useTheme();
  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
      {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([m, Icon]) => (
        <DropdownMenuItem key={m} onSelect={() => setMode(m)} className={cn(mode === m && "font-medium text-primary")}>
          <Icon /> {m[0].toUpperCase() + m.slice(1)}
        </DropdownMenuItem>
      ))}
    </>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { setMode } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Toggle light or dark theme"
      onClick={() => setMode(document.documentElement.classList.contains("dark") ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}

function AccountMenu({ collapsed }: { collapsed?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile(user);
  const initial = (profile?.name ?? user?.email ?? "?")[0].toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-sidebar-accent", collapsed && "justify-center")} aria-label="Account and theme">
          {profile?.avatarSrc ? (
            <img src={profile.avatarSrc} alt="" className="size-8 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 font-medium text-primary">{initial}</span>
          )}
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{profile?.name ?? user?.email}</span>
              {profile && <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
          <UserRound /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={async () => {
            await qc.cancelQueries();
            qc.clear();
            await supabase.auth.signOut();
            navigate({ to: "/auth", replace: true });
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const { openAdd } = useAddItem();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setCollapsed(localStorage.getItem("lv-sidebar") === "1"), []);
  const toggle = () => {
    localStorage.setItem("lv-sidebar", collapsed ? "0" : "1");
    setCollapsed(!collapsed);
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const bottom: NavItem[] = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/items", label: "All", icon: Layers, exact: true },
    { to: "/favorites", label: "Favorites", icon: Star },
    { to: "/profile", label: "Profile", icon: UserRound },
  ];

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
          <Link to="/" aria-label="LinkVault home">
            <Logo collapsed={collapsed} />
          </Link>
          {!collapsed && (
            <Button variant="ghost" size="icon" className="size-8" onClick={toggle} aria-label="Collapse sidebar">
              <ChevronsLeft />
            </Button>
          )}
        </div>
        <div className="px-3 pb-1">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" className="w-full" onClick={() => openAdd()} aria-label="Add item">
                  <Plus />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add item</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => openAdd()}>
                <Plus /> Add item
              </Button>
              <Button variant="outline" size="icon" onClick={() => setPalette(true)} aria-label="Search (Ctrl K)">
                <Search />
              </Button>
            </div>
          )}
        </div>
        <SidebarBody collapsed={collapsed} />
        <div className="border-t border-sidebar-border p-2">
          {collapsed && (
            <Button variant="ghost" size="icon" className="mb-1 w-full" onClick={toggle} aria-label="Expand sidebar">
              <ChevronsRight />
            </Button>
          )}
          <AccountMenu collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <Link to="/" className="flex-1" aria-label="LinkVault home">
            <Logo />
          </Link>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setPalette(true)} aria-label="Search">
            <Search />
          </Button>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-8 lg:px-10">{children}</main>
      </div>

      {/* Mobile bottom nav + FAB */}
      <button
        onClick={() => openAdd()}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lift active:scale-95 md:hidden"
        aria-label="Add item"
      >
        <Plus className="size-6" />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 pb-safe backdrop-blur md:hidden" aria-label="Bottom">
        {bottom.map((b) => {
          const active = isActive(path, b);
          return (
            <Link key={b.to} to={b.to} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground", active && "text-primary")}>
              <b.icon className="size-5" />
              {b.label}
            </Link>
          );
        })}
      </nav>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="flex w-[85vw] max-w-xs flex-col bg-sidebar p-0">
          <SheetHeader className="h-16 justify-center px-4">
            <SheetTitle asChild>
              <div><Logo /></div>
            </SheetTitle>
          </SheetHeader>
          <SidebarBody onNavigate={() => setDrawer(false)} />
          <div className="border-t border-sidebar-border p-2 pb-safe">
            <AccountMenu />
          </div>
        </SheetContent>
      </Sheet>

      <CommandPalette open={palette} onOpenChange={setPalette} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AddItemProvider>
      <ShellInner>{children}</ShellInner>
    </AddItemProvider>
  );
}

export function PageHeader({ title, description, icon: Icon, actions }: { title: string; description?: string; icon?: typeof Clock; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold sm:text-3xl">
          {Icon && <Icon className="size-6 text-primary" />}
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export { LogoMark };
