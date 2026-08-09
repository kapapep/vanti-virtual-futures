import { useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TradePanel } from "@/components/vanti/trade-panel";
import type { Market } from "@/lib/markets";
import type { TradeSide } from "@/lib/trade";

/** Opens the trade panel over the feed so a post can be traded without navigating. */
export function TradeDialog({
  market,
  side,
  trigger,
}: {
  market: Market;
  side: TradeSide;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
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
