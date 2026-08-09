import { createFileRoute } from "@tanstack/react-router";

import { PageStub } from "@/components/vanti/app-shell";

export const Route = createFileRoute("/_authenticated/following")({
  head: () => ({
    meta: [
      { title: "Following — Vanti" },
      { name: "description", content: "Activity from the Vanti traders you follow." },
      { property: "og:title", content: "Following — Vanti" },
      { property: "og:description", content: "Activity from the Vanti traders you follow." },
    ],
  }),
  component: () => (
    <PageStub
      title="Following"
      description="Trades and positions from the traders you follow on Vanti."
    />
  ),
});
