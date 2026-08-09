import { createFileRoute } from "@tanstack/react-router";

import { PageStub } from "@/components/vanti/app-shell";

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Vanti" },
      { name: "description", content: "Track your Vanti positions and virtual balance history." },
      { property: "og:title", content: "Portfolio — Vanti" },
      {
        property: "og:description",
        content: "Track your Vanti positions and virtual balance history.",
      },
    ],
  }),
  component: () => (
    <PageStub
      title="Portfolio"
      description="Your open positions, trade history and virtual balance activity."
    />
  ),
});