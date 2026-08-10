import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/vanti/empty-state";
import { useSession } from "@/hooks/use-vanti-session";
import { formatCount } from "@/lib/format";
import {
  followListQuery,
  followStatsQuery,
  profileByUsernameQuery,
  type FollowListKind,
} from "@/lib/social";

type Search = { tab: FollowListKind };

export const Route = createFileRoute("/_authenticated/connections/$username")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    tab: search["tab"] === "following" ? "following" : "followers",
  }),
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username}'s network — Vanti` },
      {
        name: "description",
        content: `See who follows @${params.username} and who they follow on Vanti.`,
      },
      { property: "og:title", content: `@${params.username}'s network — Vanti` },
      {
        property: "og:description",
        content: `See who follows @${params.username} and who they follow on Vanti.`,
      },
    ],
  }),
  component: ConnectionsPage,
  errorComponent: () => <EmptyState title="We couldn't load that list. Try again." />,
  notFoundComponent: () => <EmptyState title="No trader found with that username." />,
});

function ConnectionsPage() {
  const { username } = Route.useParams();
  const { tab } = Route.useSearch();
  const { user } = useSession();
  const { data: profile, isPending } = useQuery(profileByUsernameQuery(username));
  const { data: stats } = useQuery(followStatsQuery(profile?.id));

  const isOwn = Boolean(user && profile && user.id === profile.id);
  const hidden = tab === "following" && Boolean(profile?.hideFollowing) && !isOwn;
  const list = useQuery({ ...followListQuery(profile?.id, tab), enabled: Boolean(profile?.id) && !hidden });

  if (isPending) return <EmptyState title="Loading…" />;
  if (!profile) return <EmptyState title="No trader found with that username." />;

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/u/$username"
          params={{ username: profile.username }}
          className="text-meta text-muted-foreground hover:text-foreground"
        >
          ← @{profile.username}
        </Link>
        <h1 className="mt-1 text-base font-extrabold tracking-tight text-foreground">Network</h1>
      </div>

      <Tabs value={tab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="followers" asChild>
            <Link to="/connections/$username" params={{ username }} search={{ tab: "followers" }}>
              Followers <span className="num ml-1">{formatCount(stats?.followers ?? 0)}</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="following" asChild>
            <Link to="/connections/$username" params={{ username }} search={{ tab: "following" }}>
              Following <span className="num ml-1">{formatCount(stats?.following ?? 0)}</span>
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {hidden ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-8 text-center">
          <Lock className="size-5 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">This following list is private</p>
          <p className="text-meta text-muted-foreground">
            @{profile.username} keeps who they follow hidden. Their followers stay public.
          </p>
        </div>
      ) : list.isPending ? (
        <EmptyState title="Loading traders…" />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          title={
            tab === "followers"
              ? `@${profile.username} has no followers yet.`
              : `@${profile.username} isn't following anyone yet.`
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {(list.data ?? []).map((entry) => (
            <li key={entry.id}>
              <Link
                to="/u/$username"
                params={{ username: entry.username }}
                className="flex min-h-[3.5rem] items-center gap-3 p-3 transition-colors hover:bg-secondary"
              >
                <Avatar className="size-10 border border-border">
                  {entry.avatarUrl ? (
                    <AvatarImage src={entry.avatarUrl} alt={entry.username} />
                  ) : null}
                  <AvatarFallback className="bg-secondary text-xs font-medium">
                    {(entry.displayName ?? entry.username).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {entry.displayName ?? entry.username}
                  </p>
                  <p className="truncate text-meta text-muted-foreground">@{entry.username}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
