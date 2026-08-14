import { createFileRoute } from "@tanstack/react-router";
import { MarketChart } from "@/components/MarketChart";

export const Route = createFileRoute("/charttest")({ component: C });

function C() {
  const now = Math.floor(Date.now() / 1000);
  const yes: { time: number; value: number }[] = [];
  for (let i = 120; i >= 0; i--) {
    yes.push({ time: now - i * 3600, value: 60 + Math.sin(i / 8) * 12 });
  }
  yes.push({ time: now, value: 0 });
  yes.push({ time: now, value: 94 });
  const no = yes.map((p) => ({ time: p.time, value: 100 - p.value }));
  return (
    <div className="p-4">
      <MarketChart yesData={yes} noData={no} yesLabel="YES" noLabel="NO" currentYes={94} currentNo={6} volume={186520} />
    </div>
  );
}
