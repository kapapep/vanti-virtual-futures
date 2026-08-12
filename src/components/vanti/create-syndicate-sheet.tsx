import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-vanti-session";
import { formatCents } from "@/lib/format";
import type { Market } from "@/lib/markets";
import { createSyndicate, sidePrice, type SyndicateSide } from "@/lib/syndicates";
import { cn } from "@/lib/utils";

/** Default lock time: 24h out, rounded to the minute, in local input format. */
function defaultLockAt() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateSyndicateSheet({
  market,
  trigger,
}: {
  market: Market;
  trigger: React.ReactNode;
}) {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [side, setSide] = useState<SyndicateSide>("yes");
  const [target, setTarget] = useState("1000");
  const [minContribution, setMinContribution] = useState("25");
  const [maxMembers, setMaxMembers] = useState("25");
  const [feePercent, setFeePercent] = useState("0");
  const [lockAt, setLockAt] = useState(defaultLockAt);
  const [inviteOnly, setInviteOnly] = useState(false);

  const price = sidePrice(market.yesPrice, side);

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to start a syndicate.");
      const fee = Math.round(Math.min(10, Math.max(0, Number(feePercent) || 0)) * 100);
      return createSyndicate({
        marketId: market.id,
        captainId: user.id,
        name,
        description: description.trim() || null,
        outcomeSide: side,
        targetStake: Number(target),
        minContribution: Number(minContribution),
        maxMembers: Math.min(500, Math.max(2, Number(maxMembers) || 25)),
        captainFeeBps: fee,
        lockAt: new Date(lockAt).toISOString(),
        visibility: inviteOnly ? "invite_only" : "public",
      });
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["market-syndicates", market.id] });
      void queryClient.invalidateQueries({ queryKey: ["syndicate-activity"] });
      setOpen(false);
      setName("");
      setDescription("");
      toast.success("Syndicate created. Invite traders to fund it.");
      void navigate({ to: "/syndicate/$syndicateId", params: { syndicateId: id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg font-extrabold">Start a syndicate</SheetTitle>
          <SheetDescription>
            Pool virtual currency with other traders on this market. This market is binary — a draw
            or a no-show resolves NO.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          <p className="rounded-lg bg-secondary/60 p-3 text-meta text-muted-foreground">
            {market.question}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="syndicate-name">Name</Label>
            <Input
              id="syndicate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sharp money collective"
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="syndicate-description">Thesis (optional)</Label>
            <Textarea
              id="syndicate-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this side wins"
              maxLength={280}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-meta font-medium uppercase text-muted-foreground">Side</span>
            <div className="grid grid-cols-2 gap-2">
              {(["yes", "no"] as SyndicateSide[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSide(option)}
                  aria-pressed={side === option}
                  className={cn(
                    "min-h-11 rounded-md border text-sm font-extrabold uppercase transition-colors",
                    option === "yes"
                      ? side === "yes"
                        ? "border-positive bg-positive/15 text-positive"
                        : "border-border text-muted-foreground"
                      : side === "no"
                        ? "border-negative bg-negative/15 text-negative"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {option}{" "}
                  <span className="num font-semibold">
                    {formatCents(sidePrice(market.yesPrice, option))}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-meta text-muted-foreground">
              Contributions buy shares at the live price, currently{" "}
              <span className="num">{formatCents(price)}</span>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="syndicate-target">Target stake (V)</Label>
              <Input
                id="syndicate-target"
                type="number"
                inputMode="decimal"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="num"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="syndicate-min">Min contribution (V)</Label>
              <Input
                id="syndicate-min"
                type="number"
                inputMode="decimal"
                min={1}
                value={minContribution}
                onChange={(e) => setMinContribution(e.target.value)}
                className="num"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="syndicate-members">Max members</Label>
              <Input
                id="syndicate-members"
                type="number"
                inputMode="numeric"
                min={2}
                max={500}
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                className="num"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="syndicate-fee">Captain fee (% of profit)</Label>
              <Input
                id="syndicate-fee"
                type="number"
                inputMode="decimal"
                min={0}
                max={10}
                step={0.5}
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                className="num"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="syndicate-lock">Locks at</Label>
            <Input
              id="syndicate-lock"
              type="datetime-local"
              value={lockAt}
              onChange={(e) => setLockAt(e.target.value)}
              className="num"
            />
            <p className="text-meta text-muted-foreground">
              No joins after this. If the target isn't met, everyone is refunded at cost.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="syndicate-private" className="text-sm">
                Invite only
              </Label>
              <p className="text-meta text-muted-foreground">
                Only members can see this pool and its chat.
              </p>
            </div>
            <Switch id="syndicate-private" checked={inviteOnly} onCheckedChange={setInviteOnly} />
          </div>

          <Button
            className="min-h-12 w-full text-base font-extrabold"
            onClick={() => create.mutate()}
            disabled={create.isPending}
          >
            {create.isPending ? "Creating…" : "Create syndicate"}
          </Button>
          <p className="text-meta text-muted-foreground">
            Virtual currency only. No deposits, no withdrawals, no real-money value. Contributions
            can't be withdrawn once made.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}