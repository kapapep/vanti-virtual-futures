import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { MarketAmbientBackground } from "@/components/vanti/market-ambient-background";
import { VantiMark } from "@/components/vanti/vanti-mark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vanti — Virtual-Money Prediction Markets" },
      {
        name: "description",
        content:
          "Trade the outcome of real events with virtual money. Every Vanti account starts with a $10,000.00 virtual balance. No real money, ever.",
      },
      { property: "og:title", content: "Vanti — Virtual-Money Prediction Markets" },
      {
        property: "og:description",
        content:
          "Trade the outcome of real events with virtual money. Start with $10,000.00 virtual.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-background">
      <MarketAmbientBackground />

      {/* Top bar: logo centered on mobile, sign-in tucked right */}
      <header className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-5 sm:px-6 sm:pt-6">
        <span aria-hidden />
        <span aria-hidden />
        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm" className="h-11 px-3">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col justify-center px-5 py-10 text-center sm:mx-auto sm:w-full sm:max-w-xl sm:px-6 sm:py-16">
        <div className="flex flex-col items-center gap-2">
          <VantiMark size={72} title="Vanti" />
          <p className="text-[1.75rem] font-extrabold tracking-[-0.02em] text-foreground">Vanti</p>
        </div>
        <h1
          className="mt-6 text-[2rem] font-extrabold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-display"
          style={{ textShadow: "0 1px 24px var(--background)" }}
        >
          Price the future.
          <br />
          Risk nothing real.
        </h1>
        <p
          className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground sm:text-base"
          style={{ textShadow: "0 1px 16px var(--background)" }}
        >
          Trade YES and NO on real questions, watch probabilities move, and build a track record —
          all with a virtual balance.
        </p>

        <ul className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-2 text-left">
          {[
            { term: "Buy YES", detail: "When you think it happens." },
            { term: "Buy NO", detail: "When you think it doesn't." },
            { term: "Track record", detail: "Every trade lands in your portfolio." },
          ].map((item) => (
            <li
              key={item.term}
              className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-surface/70 px-4 py-3 backdrop-blur"
            >
              <span className="text-sm font-semibold text-foreground">{item.term}</span>
              <span className="text-meta text-muted-foreground">{item.detail}</span>
            </li>
          ))}
        </ul>
      </main>

      {/* Sticky app-style bottom action */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-background/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:border-0 sm:bg-transparent sm:backdrop-blur-none">
        <div className="mx-auto w-full max-w-sm">
          <Button asChild size="lg" className="h-12 w-full text-base">
            <Link to="/auth">Get started — $10,000.00 virtual</Link>
          </Button>
          <p className="mt-3 text-center text-meta text-muted-foreground">
            No deposits, no withdrawals. Not a gambling or financial service.
          </p>
        </div>
      </div>
    </div>
  );
}
