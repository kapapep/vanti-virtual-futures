import { createFileRoute } from "@tanstack/react-router";

import { PageStub } from "@/components/vanti/app-shell";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Vanti Prediction Markets" },
      {
        name: "description",
        content: "Your Vanti home feed: virtual-money prediction markets at a glance.",
      },
      { property: "og:title", content: "Home — Vanti Prediction Markets" },
      {
        property: "og:description",
        content: "Your Vanti home feed: virtual-money prediction markets at a glance.",
      },
    ],
  }),
  component: () => (
    <PageStub
      title="Home"
      description="Your feed of live markets, price moves and activity from traders you follow."
    />
  ),
});
