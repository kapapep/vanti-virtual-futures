import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Grid3x3, LineChart, Layers } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditProfileDialog } from "@/components/vanti/edit-profile-dialog";
import { EmptyState } from "@/components/vanti/empty-state";
import { PostCard } from "@/components/vanti/post-card";
import { ProfileActionsMenu } from "@/components/vanti/profile-actions-menu";
import { ProfileSkeleton } from "@/components/vanti/skeletons";
import { TradeHistoryList } from "@/components/vanti/trade-history-list";
import { useSession } from "@/hooks/use-vanti-session";
import {
  formatBalance,
  formatCents,
  formatContracts,
  formatCount,
  formatDate,
  formatPercent,
  formatSignedBalance,
  formatSignedPercent,
} from "@/lib/format";
import {
  positionsQuery,
  resolvedResultsQuery,
  STARTING_BALANCE,
  tradeHistoryQuery,
} from "@/lib/portfolio";
import { userPostsQuery } from "@/lib/posts";
import {
  followStatsQuery,
  isFollowingQuery,
  profileByUsernameQuery,
  setFollowing,
} from "@/lib/social";
import {
  balanceErrorMessage,
  resetVirtualBalance,
  STARTING_BALANCE_LABEL,
} from "@/lib/virtual-balance";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Vanti` },
      {
        name: "description",
        content: `Trading record, open positions and profit and loss for @${params.username} on Vanti.`,
      },
      { property: "og:title", content: `@${params.username} — Vanti` },
      {
        property: "og:description",
        content: `Trading record, open positions and profit and loss for @${params.username} on Vanti.`,
      },
    ],
  }),
  component: UserProfilePage,
  errorComponent: () => (
    <EmptyState title="We couldn't find that trader. Check the username and try again." />
  ),
  notFoundComponent: () => <EmptyState title="No trader found with that username." />,
});

function UserProfilePage() {
  const { username } = Route.useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const { data: profile, isPending, isError } = useQuery(profileByUsernameQuery(username));
  const { data: stats } = useQuery(followStatsQuery(profile?.id));
  const { data: following = false } = useQuery(isFollowingQuery(user?.id, profile?.id));
  const { data: positions = [] } = useQuery(positionsQuery(profile?.id));
  const { data: trades = [] } = useQuery(tradeHistoryQuery(profile?.id));
  const { data: resolved = { wins: 0, total: 0 } } = useQuery(resolvedResultsQuery(profile?.id));
  const { data: posts = [] } = useQuery(userPostsQuery(profile?.id, user?.id));

  const follow = useMutation({
    mutationFn: (next: boolean) =>
      setFollowing({ viewerId: user!.id, profileId: profile!.id, follow: next }),
    onSuccess: (_data, next) => {
      toast.success(next ? `Following @${username}` : `Unfollowed @${username}`);
      void queryClient.invalidateQueries({ queryKey: ["is-following"] });
      void queryClient.invalidateQueries({ queryKey: ["follow-stats"] });
    },
    onError: () => toast.error("Couldn't update follow. Try again."),
  });

  const reset = useMutation({
    mutationFn: resetVirtualBalance,
    onSuccess: () => {
      toast.success(`Reset your virtual balance to ${STARTING_BALANCE_LABEL}.`);
      setConfirmingReset(false);
      void queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(balanceErrorMessage(error)),
  });

  if (isPending) return <ProfileSkeleton />;
  if (isError || !profile) return <EmptyState title="No trader found with that username." />;

  const isOwn = user?.id === profile.id;
  const positionsValue = positions.reduce((sum, p) => sum + p.value, 0);
  const portfolioValue = profile.balance + positionsValue;
  const totalPnl = portfolioValue - STARTING_BALANCE;
  const winRate = resolved.total > 0 ? resolved.wins / resolved.total : null;
  const initials = (profile.displayName ?? profile.username).slice(0, 2).toUpperCase();

  return (
    <div className="@container space-y-6">
      {/* Username row with overflow menu — Instagram-style header */}
      <div className="-mt-2 flex items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-base font-extrabold tracking-tight text-foreground">
          @{profile.username}
        </h1>
        <ProfileActionsMenu username={profile.username} isOwn={isOwn} />
      </div>

      {/* Avatar + counts */}
      <section className="space-y-4">
        <div className="flex items-center gap-6 @md:gap-10">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={`${profile.displayName ?? profile.username} avatar`}
              className="size-20 shrink-0 rounded-full border border-border object-cover @md:size-28"
              loading="lazy"
            />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xl font-semibold text-muted-foreground @md:size-28">
              {initials}
            </div>
          )}
          <div className="grid flex-1 grid-cols-3 gap-2 text-center">
            <Count label="Posts" value={formatCount(posts.length)} />
            <Link
              to="/connections/$username"
              params={{ username: profile.username }}
              search={{ tab: "followers" as const }}
              className="rounded-md transition-colors hover:bg-secondary"
            >
              <Count label="Followers" value={formatCount(stats?.followers ?? 0)} />
            </Link>
            <Link
              to="/connections/$username"
              params={{ username: profile.username }}
              search={{ tab: "following" as const }}
              className="rounded-md transition-colors hover:bg-secondary"
            >
              <Count label="Following" value={formatCount(stats?.following ?? 0)} />
            </Link>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">
            {profile.displayName ?? profile.username}
          </p>
          {profile.bio ? (
            <p className="max-w-prose whitespace-pre-line text-sm text-foreground">{profile.bio}</p>
          ) : null}
          <p className="num text-meta text-muted-foreground">
            Joined {formatDate(profile.createdAt)}
          </p>
        </div>

        <div className="flex gap-2">
          {isOwn ? (
            <EditProfileDialog
              userId={profile.id}
              displayName={profile.displayName ?? ""}
              bio={profile.bio ?? ""}
              avatarUrl={profile.avatarUrl ?? ""}
              username={profile.username}
              hideFollowing={profile.hideFollowing}
              trigger={
                <Button variant="outline" className="h-11 flex-1">
                  Edit profile
                </Button>
              }
            />
          ) : (
            <Button
              variant={following ? "outline" : "default"}
              className="h-11 flex-1"
              disabled={follow.isPending || !user}
              onClick={() => follow.mutate(!following)}
            >
              {following ? "Following" : "Follow"}
            </Button>
          )}
          <Button variant="outline" className="h-11 flex-1" asChild>
            <Link to="/markets">{isOwn ? "Find markets" : "View markets"}</Link>
          </Button>
        </div>
      </section>

      {/* Performance strip */}
      <section className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 @md:grid-cols-4">
        <Stat label="Portfolio value" value={formatBalance(portfolioValue)} />
        <Stat
          label="Total P&L"
          value={formatSignedBalance(totalPnl)}
          sub={formatSignedPercent(totalPnl / STARTING_BALANCE)}
          tone={totalPnl >= 0 ? "positive" : "negative"}
        />
        <Stat
          label="Win rate"
          value={winRate === null ? "—" : formatPercent(winRate)}
          sub={resolved.total ? `${resolved.wins}/${resolved.total} resolved` : "No resolutions"}
        />
        <Stat label="Open positions" value={String(positions.length)} />
      </section>

      {/* Icon tabs — TikTok/Instagram style */}
      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts" aria-label="Posts">
            <Grid3x3 className="size-4" />
          </TabsTrigger>
          <TabsTrigger value="trades" aria-label="Trades">
            <LineChart className="size-4" />
          </TabsTrigger>
          <TabsTrigger value="positions" aria-label="Positions">
            <Layers className="size-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="@container">
          {posts.length ? (
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                isOwn
                  ? "You haven't posted yet. Share a take on a market."
                  : `@${profile.username} hasn't posted yet.`
              }
            />
          )}
        </TabsContent>

        <TabsContent value="trades" className="@container">
          <TradeHistoryList
            trades={trades}
            emptyCopy={
              isOwn
                ? "Your trade history will appear here."
                : `@${profile.username}'s trade history is private.`
            }
          />
        </TabsContent>

        <TabsContent value="positions">
          {positions.length ? (
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {positions.map((position) => (
                <div key={position.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-meta font-semibold uppercase",
                        position.side === "yes"
                          ? "bg-positive-subtle text-positive"
                          : "bg-negative-subtle text-negative",
                      )}
                    >
                      {position.side}
                    </span>
                    <span className="num text-meta text-muted-foreground">
                      {formatContracts(position.contracts)} contracts @{" "}
                      {formatCents(position.avgPrice)}
                    </span>
                  </div>
                  <Link
                    to="/market/$marketId"
                    params={{ marketId: position.marketId }}
                    className="mt-1 line-clamp-2 block text-sm font-medium text-foreground hover:text-accent-solid"
                  >
                    {position.question}
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                isOwn
                  ? "No open positions yet. Browse markets to place your first trade."
                  : `@${profile.username} has no open positions.`
              }
            />
          )}
        </TabsContent>
      </Tabs>

      {isOwn ? (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Settings</h2>
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="flex w-full items-center justify-between py-3 text-left text-sm text-foreground transition-colors hover:text-negative"
          >
            <span>Reset virtual balance</span>
            <span className="text-meta text-muted-foreground">Clears positions &amp; history</span>
          </button>
        </section>
      ) : null}

      <AlertDialog open={confirmingReset} onOpenChange={setConfirmingReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset your virtual balance?</AlertDialogTitle>
            <AlertDialogDescription>
              Reset your virtual balance to {STARTING_BALANCE_LABEL}? This clears your positions and
              trade history. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                reset.mutate();
              }}
              disabled={reset.isPending}
            >
              {reset.isPending ? "Resetting…" : "Reset balance"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="num text-base font-bold text-foreground @md:text-lg">{value}</p>
      <p className="text-meta text-muted-foreground">{label}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div>
      <p className="text-meta font-medium uppercase text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num mt-1 text-lg font-semibold",
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : "text-foreground",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p
          className={cn(
            "num text-meta",
            tone === "positive"
              ? "text-positive"
              : tone === "negative"
                ? "text-negative"
                : "text-muted-foreground",
          )}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}
