import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MarketChart } from "@/components/MarketChart";

const now = Math.floor(Date.now() / 1000);
const data = Array.from({ length: 120 }, (_, i) => ({
  time: now - (120 - i) * 3600,
  value: 40 + 20 * Math.sin(i / 9),
}));

function Probe() {
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setReady(true), 300);
    const b = setTimeout(() => setLoaded(true), 900);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  if (!ready) return <div className="h-80 w-full bg-black" />;
  return (
    <div className="min-h-screen bg-black p-4">
      <div className="@container mt-4">
        <div className="grid gap-4 @[600px]:grid-cols-[1fr_280px] @[900px]:grid-cols-[220px_1fr_300px]">
          <div className="order-1 min-w-0 space-y-6 @[900px]:order-2">
            <MarketChart yesData={loaded ? data : data.slice(-2)} currentYes={55} volume={12345} />
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/chart-probe")({
  component: Probe,
  head: () => ({ meta: [{ title: "Chart probe" }] }),
});
