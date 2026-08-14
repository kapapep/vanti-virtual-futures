import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/glossary")({
  head: () => ({
    meta: [
      { title: "Glossary — Vanti" },
      { name: "description", content: "Learn how prediction markets work in Vanti: what the percentage means, how YES and NO pricing works, and how virtual payouts are calculated." },
      { property: "og:title", content: "Glossary — Vanti" },
      { property: "og:description", content: "Learn how prediction markets work in Vanti." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GlossaryPage,
});

function Term({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#131315] p-5", className)}>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-sm text-foreground">
      {children}
    </div>
  );
}

function GlossaryPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-10 shrink-0" asChild>
          <Link to="/home" search={{ tab: "for-you" }}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <BookOpen className="size-5 text-accent-solid" />
            Glossary
          </h1>
          <p className="text-meta text-muted-foreground">How Vanti prediction markets work.</p>
        </div>
      </div>

      <Term title="What does the % mean?">
        <p>
          The percentage is the market&apos;s live estimate that the event will happen. It is also
          the current price of a <strong>YES</strong> share.
        </p>
        <ExampleBox>
          <ul className="space-y-1">
            <li>
              <span className="text-positive">YES 62%</span> — the market thinks there is a 62% chance the event happens.
            </li>
            <li>
              <span className="text-negative">NO 38%</span> — the remaining probability; NO shares cost 38%.
            </li>
          </ul>
        </ExampleBox>
        <p>
          YES and NO always add up to 100%. When more traders buy YES, the % rises and NO falls.
          When more buy NO, the % drops.
        </p>
      </Term>

      <Term title="How YES / NO pricing works">
        <p>
          Every market starts at 50% / 50%. Each trade nudges the price based on which side is being
          bought or sold.
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <strong>Buy YES</strong> or <strong>Sell NO</strong> pushes the YES % up.
          </li>
          <li>
            <strong>Buy NO</strong> or <strong>Sell YES</strong> pushes the YES % down.
          </li>
          <li>
            Prices are clamped between <span className="num">1%</span> and{" "}
            <span className="num">99%</span> so a side never reaches zero.
          </li>
        </ul>
        <p>
          The price you see is the price you pay per contract. Buying 10 YES contracts at 62% costs
          V6.20.
        </p>
      </Term>

      <Term title="Virtual currency (V)">
        <p>
          Vanti uses virtual money only. Your balance starts at V10,000.00 and can never be turned
          into real cash.
        </p>
        <p>
          <strong>V</strong> is just a play-money label so the app never looks like real finance.
          There are no deposits, withdrawals, or real-money payouts.
        </p>
      </Term>

      <Term title="Payouts and P&L">
        <p>
          When a market resolves, winning shares pay V1.00 each. Losing shares pay nothing.
        </p>
        <ExampleBox>
          <p className="font-medium">Example</p>
          <p className="mt-1">
            You buy 100 YES contracts at 60% for V60.00. If YES wins, you receive V100.00 — a
            profit of V40.00. If NO wins, the position is worth V0.
          </p>
        </ExampleBox>
        <p>
          <strong>Unrealized P&L</strong> shows how much your open position would be worth if the
          market resolved right now. <strong>Realized P&L</strong> is profit or loss from already
          closed trades.
        </p>
      </Term>

      <Term title="Resolution">
        <p>
          A market resolves when the outcome is known. The creator or admin sets the result to YES
          or NO, and winning contracts automatically pay V1.00 each.
        </p>
        <p>
          Until resolution, you can sell your position back to the market at the current price.
        </p>
      </Term>

      <div className="flex items-start gap-3 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#131315] p-5">
        <HelpCircle className="mt-0.5 size-5 shrink-0 text-accent-solid" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Still have questions?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prediction markets price in probabilities. If you think an event is more likely than the
            current % suggests, buy YES. If you think it is less likely, buy NO.
          </p>
        </div>
      </div>
    </div>
  );
}
