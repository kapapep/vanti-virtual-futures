import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/vanti/theme-toggle";
import { Wordmark } from "@/components/vanti/wordmark";

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
        <Wordmark />
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-20">
        <p className="text-meta font-medium uppercase text-accent-solid">
          Virtual money only — no deposits, no withdrawals
        </p>
        <h1 className="mt-4 text-display font-semibold text-foreground">
          Price the future. Risk nothing real.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          Vanti is a prediction market for people who like being right. Trade YES and NO on real
          questions, watch probabilities move in real time, and build a track record — all with a
          virtual balance.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Claim $10,000.00 virtual</Link>
          </Button>
          <span className="num text-meta text-muted-foreground">
            Starting balance: $10,000.00
          </span>
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
      </main>

      <footer className="border-t border-border px-6 py-6 text-meta text-muted-foreground">
        Vanti uses virtual money for entertainment and skill-building. It is not a gambling or
        financial service.
      </footer>
    </div>
  );
}
