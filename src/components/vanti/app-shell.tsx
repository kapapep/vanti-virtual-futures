import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CircleUser,
  House,
  LogOut,
  Pencil,
  Search,
  Star,
  TrendingUp,
  Users2,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/vanti/global-search";
import { HomeFeedTabs } from "@/components/vanti/home-feed-tabs";
import { EditProfileDialog } from "@/components/vanti/edit-profile-dialog";
import { VantiMark } from "@/components/vanti/vanti-mark";
import { useProfile } from "@/hooks/use-vanti-session";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const primaryNav = [
  { label: "Home", to: "/home", icon: House },
  { label: "Markets", to: "/markets", icon: TrendingUp },
  { label: "Syndicates", to: "/syndicates", icon: Users2 },
  { label: "Portfolio", to: "/portfolio", icon: Wallet },
  { label: "Watchlist", to: "/watchlist", icon: Star },
  { label: "Following", to: "/following", icon: CircleUser },
] as const;

const mobileNav = [
  { label: "Feed", to: "/home", icon: House },
  { label: "Markets", to: "/markets", icon: TrendingUp },
  { label: "Syndicates", to: "/syndicates", icon: Users2 },
  { label: "Portfolio", to: "/portfolio", icon: Wallet },
  { label: "Profile", to: "/profile", icon: CircleUser },
] as const;

function AccountMenu() {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const initials = (profile?.display_name ?? profile?.username ?? "V").slice(0, 2).toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="grid size-11 place-items-center rounded-full"
          aria-label="Account menu"
        >
          <Avatar className="size-9 border border-border">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt="Your profile picture" />
            ) : null}
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
        <DropdownMenuItem onSelect={() => setEditOpen(true)}>
          <Pencil className="size-4" /> Edit profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
      {profile ? (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          userId={profile.id}
          username={profile.username}
          displayName={profile.display_name ?? ""}
          avatarUrl={profile.avatar_url ?? ""}
          showBio={false}
        />
      ) : null}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);
  const isHome = pathname === "/home";

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/home" search={{ tab: "for-you" }} className="flex items-center px-2">
          <VantiMark size={40} title="Vanti" />
        </Link>
        {/* Search stays in the chrome between lg and xl, where the right rail is hidden. */}
        <div className="mt-4 xl:hidden">
          <GlobalSearch />
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {primaryNav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                search={item.to === "/home" ? { tab: "for-you" } : {}}
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
        <p className="mt-auto px-1 text-meta text-muted-foreground">
          Virtual money only. No real funds, ever.
        </p>
      </aside>

      {/* Mobile top bar */}
      <header
        className={cn(
          "sticky top-0 z-20 grid items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur lg:hidden",
          isHome
            ? "grid-cols-[1fr_auto_1fr] border-b border-border"
            : "grid-cols-[minmax(0,1fr)_auto] border-b border-border",
        )}
      >
        <Link to="/home" search={{ tab: "for-you" }} className="flex min-w-0 items-center">
          <VantiMark size={36} title="Vanti" />
        </Link>
        {isHome ? <HomeFeedTabs className="justify-self-center" /> : null}
        <div className="flex shrink-0 items-center gap-2">
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Search">
                <Search className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-24 translate-y-0 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-left text-sm">Search Vanti</DialogTitle>
                <DialogDescription className="text-left text-meta">
                  Find markets by question or traders by username.
                </DialogDescription>
              </DialogHeader>
              <GlobalSearch autoFocus onNavigate={() => setSearchOpen(false)} />
            </DialogContent>
          </Dialog>
          <AccountMenu />
        </div>
      </header>

      <div className="lg:pl-60">
        <div className="mx-auto flex w-full max-w-[1400px] gap-8 px-4 pb-24 pt-6 lg:px-8 lg:pb-12">
          <main className="min-w-0 flex-1">{children}</main>

          {/* Desktop right rail */}
          <div className="hidden w-72 shrink-0 flex-col gap-4 xl:flex">
            <div className="flex items-center gap-2">
              <GlobalSearch className="flex-1" />
              <Button variant="ghost" size="icon" className="size-11" aria-label="Notifications">
                <Bell className="size-4" />
              </Button>
              <AccountMenu />
            </div>
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
              search={item.to === "/home" ? { tab: "for-you" } : {}}
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
