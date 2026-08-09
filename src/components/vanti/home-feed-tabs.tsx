import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export type HomeTab = "for-you" | "following";

const tabs = [
  { id: "for-you" as HomeTab, label: "For You" },
  { id: "following" as HomeTab, label: "Following" },
];

/** TikTok-style feed switcher, rendered inside the top chrome on the home route. */
export function HomeFeedTabs({ className }: { className?: string }) {
  const search = useRouterState({ select: (s) => s.location.search as { tab?: string } });
  const active: HomeTab = search?.tab === "following" ? "following" : "for-you";

  return (
    <nav className={cn("flex items-center justify-center gap-5", className)} aria-label="Feed">
      {tabs.map((item) => (
        <Link
          key={item.id}
          to="/home"
          search={{ tab: item.id }}
          replace
          aria-current={active === item.id}
          className={cn(
            "relative flex min-h-11 items-center px-1 text-sm transition-colors",
            active === item.id ? "font-extrabold text-foreground" : "text-muted-foreground",
          )}
        >
          {item.label}
          <span
            className={cn(
              "absolute inset-x-0 bottom-1.5 h-0.5 rounded-full",
              active === item.id ? "bg-foreground" : "bg-transparent",
            )}
          />
        </Link>
      ))}
    </nav>
  );
}
