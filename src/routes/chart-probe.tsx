import { createFileRoute } from "@tanstack/react-router";
import { MarketChart } from "@/components/MarketChart";

export const Route = createFileRoute("/chart-probe")({ component: Probe });

function Probe() {
  const now = Math.floor(Date.now() / 1000);
  const yesData = Array.from({ length: 120 }, (_, i) => ({
    time: now - (120 - i) * 3600,
    value: 45 + Math.sin(i / 9) * 12,
  }));
  return (
    <div className="p-4">
      <MarketChart yesData={yesData} currentYes={57} volume={124533} />
    </div>
  );
}
