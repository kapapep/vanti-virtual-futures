import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Compass,
  Home,
  LineChart,
  LogOut,
  PieChart,
  Search,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/vanti/theme-toggle";
import { Wordmark } from "@/components/vanti/wordmark";
import { useProfile } from "@/hooks/use-vanti-session";
import { supabase } from "@/integrations/supabase/client";
import { formatBalance } from "@/lib/format";
import { cn } from "@/lib/utils";

const primaryNav = [
  { label: "Home", to: "/home", icon: Home },
  { label: "Discover", to: "/discover", icon: Compass },
  { label: "Markets", to: "/markets", icon: LineChart },
  { label: "Portfolio", to: "/portfolio", icon: PieChart },
  { label: "Watchlist", to: "/watchlist", icon: Star },
  { label: "Following", to: "/following", icon: Users },
] as const;

const mobileNav = [
  { label: "Home", to: "/home", icon: Home },
  { label: "Discover", to: "/discover", icon: Compass },
  { label: "Trade", to: "/markets", icon: LineChart },
  { label: "Portfolio", to: "/portfolio", icon: PieChart },
  { label: "Profile", to: "/profile", icon: User },
] as const;

function BalanceChip({ className }: { className?: string }) {
  const { data: profile, isPending } = useProfile();

  return (
    <div
      className={cn("rounded-md border border-border bg-surface px-3 py-1.5 text-right", className)}
    >
      <p className="text-meta font-medium uppercase text-muted-foreground">Virtual balance</p>
      <p className="num text-sm font-semibold text-foreground">
        {isPending && !profile ? "—" : formatBalance(profile?.balance)}
      </p>
    </div>
  );
}

function AccountMenu() {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initials = (profile?.display_name ?? profile?.username ?? "V").slice(0, 2).toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          <Avatar className="size-9 border border-border">
            <AvatarFallback className="bg-secondary text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-medium">
          {profile?.display_name ?? "Trader"}
          <span className="block text-meta font-normal text-muted-foreground">
            @{profile?.username ?? "…"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/home" className="px-2">
          <Wordmark />
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {primaryNav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <BalanceChip className="text-left" />
          <p className="px-1 text-meta text-muted-foreground">
            Virtual money only. No real funds, ever.
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/home" className="min-w-0">
          <Wordmark />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <BalanceChip />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </header>

      <div className="lg:pl-60">
        <div className="mx-auto flex w-full max-w-[1400px] gap-8 px-4 pb-24 pt-6 lg:px-8 lg:pb-12">
          <main className="min-w-0 flex-1">{children}</main>

          {/* Desktop right rail */}
          <div className="hidden w-72 shrink-0 flex-col gap-4 xl:flex">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search markets"
                  className="h-9 bg-surface pl-9 text-sm"
                  aria-label="Search markets"
                />
              </div>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="size-4" />
              </Button>
              <ThemeToggle />
              <AccountMenu />
            </div>
            <BalanceChip className="text-left" />
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-background lg:hidden">
        {mobileNav.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-meta font-medium transition-colors",
                active ? "text-accent-solid" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageStub({ title, description }: { title: string; description: string }) {
  return (
    <section className="space-y-2">
      <h1 className="text-figure font-semibold text-foreground">{title}</h1>
      <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 rounded-lg border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-sm font-medium text-foreground">Coming soon</p>
        <p className="mt-1 text-meta text-muted-foreground">
          This section is part of the Vanti foundation and will be built next.
        </p>
      </div>
    </section>
  );
}
