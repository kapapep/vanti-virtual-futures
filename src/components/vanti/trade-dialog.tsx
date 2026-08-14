import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TradePanel } from "@/components/vanti/trade-panel";
import { useSession } from "@/hooks/use-vanti-session";
import type { Market } from "@/lib/markets";
import type { TradeSide } from "@/lib/trade";

/**
 * Renders the trigger while auth/market state is still resolving. Keeping the
 * disabled trigger mounted means a tap can never silently no-op: either the
 * dialog opens, we route to sign-in, or the control is visibly disabled.
 */
function DisabledTrigger({ trigger }: { trigger: ReactNode }) {
  return (
    <div aria-busy className="pointer-events-none flex flex-1 opacity-60">
      {trigger}
    </div>
  );
}

/** Opens the trade panel over the feed so a post can be traded without navigating. */
export function TradeDialog({
  market,
  side,
  trigger,
  pending = false,
}: {
  market: Market;
  side: TradeSide;
  trigger: ReactNode;
  /** External loading state (e.g. market still fetching on a direct URL load). */
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { user, loading: authLoading } = useSession();
  const navigate = useNavigate();

  if (pending || authLoading) return <DisabledTrigger trigger={trigger} />;

  if (!user) {
    return (
      <div
        className="flex flex-1"
        onClick={() => {
          console.log("[trade] buy blocked — signed out", { side, marketId: market.id });
          toast.error("Sign in to place a trade.");
          void navigate({ to: "/auth" });
        }}
      >
        {trigger}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div
        className="flex flex-1"
        onClick={() => {
          console.log("[trade] buy tapped", {
            side,
            marketId: market.id,
            userId: user.id,
            authLoading,
            pending,
          });
          setOpen(true);
        }}
      >
        {trigger}
      </div>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left text-sm font-semibold leading-snug">
            {market.question}
          </DialogTitle>
          <DialogDescription className="text-left text-meta">
            Virtual money only — no real funds are involved.
          </DialogDescription>
        </DialogHeader>
        {open ? <TradePanel market={market} initialSide={side} compact /> : null}
      </DialogContent>
    </Dialog>
  );
}
