import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import VantiIntro from "@/components/VantiIntro";
import { MarketAmbientBackground } from "@/components/vanti/market-ambient-background";
import { VantiMark } from "@/components/vanti/vanti-mark";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vanti — Virtual-Money Prediction Markets" },
      {
        name: "description",
        content:
          "Trade the outcome of real events with virtual money. Every Vanti account starts with a V10,000.00 virtual balance. No real money, ever.",
      },
      { property: "og:title", content: "Vanti — Virtual-Money Prediction Markets" },
      {
        property: "og:description",
        content:
          "Trade the outcome of real events with virtual money. Start with V10,000.00 virtual.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [showIntro, setShowIntro] = useState(true);
  const handleComplete = useCallback(() => setShowIntro(false), []);

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-background">
      <MarketAmbientBackground />
      {showIntro && <VantiIntro onComplete={handleComplete} />}

      <main className="relative z-10 flex flex-1 flex-col justify-center px-5 pb-6 pt-10 text-center sm:mx-auto sm:w-full sm:max-w-xl sm:px-6 sm:py-16">
        <div className="flex flex-col items-center">
          <VantiMark size={72} title="Vanti" />
          <p className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.02em] text-foreground">Vanti</p>
        </div>
        <h1
          className="mt-4 text-[2rem] font-extrabold leading-[1.05] tracking-[-0.02em] text-foreground sm:mt-6 sm:text-display"
          style={{ textShadow: "0 1px 24px var(--background)" }}
        >
          Price the future.
          <br />
          Risk nothing real.
        </h1>
        <p
          className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground sm:mt-4 sm:text-base"
          style={{ textShadow: "0 1px 16px var(--background)" }}
        >
          Trade YES and NO on real questions, watch probabilities move, and build a track record —
          all with a virtual balance.
        </p>

        <div className="mx-auto mt-6 w-full max-w-sm sm:mt-8">
          <Button asChild size="lg" className="h-12 w-full text-base">
            <Link to="/auth">Get started — V10,000.00 virtual</Link>
          </Button>
          <p className="mt-3 text-center text-meta text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth" className="text-accent-solid hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <ul className="mx-auto mt-6 flex w-full max-w-sm flex-col text-left sm:mt-8">
          {[
            { term: "Buy YES", detail: "When you think it happens." },
            { term: "Buy NO", detail: "When you think it doesn't." },
            { term: "Track record", detail: "Every trade lands in your portfolio." },
          ].map((item, index, arr) => (
            <li
              key={item.term}
              className={cn(
                "flex items-baseline justify-between gap-3 py-3",
                index !== arr.length - 1 && "border-b border-white/[0.06]"
              )}
            >
              <span className="text-[15px] font-semibold text-foreground">{item.term}</span>
              <span className="text-sm text-muted-foreground">{item.detail}</span>
            </li>
          ))}
        </ul>
      </main>

      {/* Bottom disclaimer */}
      <div className="relative z-10 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:pb-6">
        <p className="mx-auto max-w-sm text-center text-meta text-muted-foreground">
          No deposits, no withdrawals. Not a gambling or financial service.
        </p>
      </div>
    </div>
  );
}
