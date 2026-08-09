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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-6 py-4">
        <Link to="/" className="flex items-center" aria-label="Vanti">
          <VantiMark size={22} title="Vanti" className="md:hidden" />
          <VantiMark size={28} title="Vanti" className="hidden md:block" />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col justify-center overflow-hidden">
        <MarketAmbientBackground />
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-6 py-20">
          <p className="text-meta font-medium uppercase text-accent-solid">
            Virtual money only — no deposits, no withdrawals
          </p>
          <h1
            className="mt-4 text-display font-semibold text-foreground"
            style={{ textShadow: "0 1px 24px var(--background)" }}
          >
            Price the future. Risk nothing real.
          </h1>
          <p
            className="mt-4 max-w-xl text-base text-muted-foreground"
            style={{ textShadow: "0 1px 16px var(--background)" }}
          >
            Vanti is a prediction market for people who like being right. Trade YES and NO on real
            questions, watch probabilities move in real time, and build a track record — all with a
            virtual balance.
          </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Claim $10,000.00 virtual</Link>
          </Button>
          <span className="num text-meta text-muted-foreground">Starting balance: $10,000.00</span>
        </div>

        <dl className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { term: "YES", detail: "Buy when you think it happens." },
            { term: "NO", detail: "Buy when you think it doesn't." },
            { term: "Track record", detail: "Every trade is logged to your portfolio." },
          ].map((item) => (
            <div key={item.term} className="rounded-lg border border-border bg-surface p-4">
              <dt className="text-sm font-medium text-foreground">{item.term}</dt>
              <dd className="mt-1 text-meta text-muted-foreground">{item.detail}</dd>
            </div>
          ))}
        </dl>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-meta text-muted-foreground">
        Vanti uses virtual money for entertainment and skill-building. It is not a gambling or
        financial service.
      </footer>
    </div>
  );
}
