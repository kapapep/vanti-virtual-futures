import { createFileRoute } from "@tanstack/react-router";
import { MarketChart } from "@/components/MarketChart";

const now = Math.floor(Date.now() / 1000);
const data = Array.from({ length: 120 }, (_, i) => ({
  time: now - (120 - i) * 3600,
  value: 40 + 20 * Math.sin(i / 9),
}));

export const Route = createFileRoute("/chart-probe")({
  component: () => (
    <div className="min-h-screen bg-black p-4">
      <MarketChart yesData={data} currentYes={55} volume={12345} />
    </div>
  ),
  head: () => ({ meta: [{ title: "Chart probe" }] }),
});
