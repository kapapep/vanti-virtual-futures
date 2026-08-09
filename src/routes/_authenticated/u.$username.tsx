import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditProfileDialog } from "@/components/vanti/edit-profile-dialog";
import { EmptyState } from "@/components/vanti/empty-state";
import { ProfileSkeleton } from "@/components/vanti/skeletons";
import { TradeHistoryList } from "@/components/vanti/trade-history-list";
import { useSession } from "@/hooks/use-vanti-session";
import {
  formatBalance,
  formatCents,
  formatContracts,
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
import {
  followStatsQuery,
  isFollowingQuery,
  profileByUsernameQuery,
  setFollowing,
} from "@/lib/social";
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

  const { data: profile, isPending, isError } = useQuery(profileByUsernameQuery(username));
  const { data: stats } = useQuery(followStatsQuery(profile?.id));
  const { data: following = false } = useQuery(isFollowingQuery(user?.id, profile?.id));
  const { data: positions = [] } = useQuery(positionsQuery(profile?.id));
  const { data: trades = [] } = useQuery(tradeHistoryQuery(profile?.id));
  const { data: resolved = { wins: 0, total: 0 } } = useQuery(resolvedResultsQuery(profile?.id));

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

  if (isPending) return <ProfileSkeleton />;
  if (isError || !profile)
    return <EmptyState title="No trader found with that username." />;

  const isOwn = user?.id === profile.id;
  const positionsValue = positions.reduce((sum, p) => sum + p.value, 0);
  const portfolioValue = profile.balance + positionsValue;
  const totalPnl = portfolioValue - STARTING_BALANCE;
  const winRate = resolved.total > 0 ? resolved.wins / resolved.total : null;
  const initials = (profile.displayName ?? profile.username).slice(0, 2).toUpperCase();

  return (
    <div className="@container space-y-8">
      <section className="rounded-lg border border-border bg-card p-5 @md:p-6">
        <div className="flex flex-col gap-5 @md:flex-row @md:items-start @md:justify-between">
          <div className="flex items-start gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={`${profile.displayName ?? profile.username} avatar`}
                className="size-16 rounded-full border border-border object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full border border-border bg-surface text-lg font-semibold text-muted-foreground">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-figure font-semibold text-foreground">
                {profile.displayName ?? profile.username}
              </h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio ? (
                <p className="mt-2 max-w-prose text-sm text-foreground">{profile.bio}</p>
              ) : null}
              <p className="num mt-2 text-meta text-muted-foreground">
                Joined {formatDate(profile.createdAt)} · {stats?.followers ?? 0} followers ·{" "}
                {stats?.following ?? 0} following
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {isOwn ? (
              <EditProfileDialog
                userId={profile.id}
                displayName={profile.displayName ?? ""}
                bio={profile.bio ?? ""}
                avatarUrl={profile.avatarUrl ?? ""}
                username={profile.username}
                trigger={<Button variant="outline">Edit profile</Button>}
              />
            ) : (
              <Button
                variant={following ? "outline" : "default"}
                disabled={follow.isPending || !user}
                onClick={() => follow.mutate(!following)}
              >
                {following ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 @md:grid-cols-4">
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
        </div>
      </section>

      <Tabs defaultValue="trades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
        </TabsList>
        <TabsContent value="trades" className="@container">
          <TradeHistoryList
            trades={trades}
            emptyCopy={
              isOwn
                ? "Your trade history will appear here."
                : `@${profile.username} hasn't traded yet.`
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

function EditProfileDialog(props: {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(props.displayName);
  const [bio, setBio] = useState(props.bio);
  const [avatarUrl, setAvatarUrl] = useState(props.avatarUrl);

  useEffect(() => {
    if (!open) return;
    setDisplayName(props.displayName);
    setBio(props.bio);
    setAvatarUrl(props.avatarUrl);
  }, [open, props.displayName, props.bio, props.avatarUrl]);

  const save = useMutation({
    mutationFn: () => updateOwnProfile({ userId: props.userId, displayName, bio, avatarUrl }),
    onSuccess: () => {
      toast.success("Profile updated");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["public-profile", props.username] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Couldn't save your profile. Try again."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              rows={3}
              maxLength={240}
              onChange={(event) => setBio(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              placeholder="https://…"
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
          </div>
          <p className="text-meta text-muted-foreground">
            Username and balance can't be changed here.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
