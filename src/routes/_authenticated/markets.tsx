import { createFileRoute } from "@tanstack/react-router";

import { PageStub } from "@/components/vanti/app-shell";

export const Route = createFileRoute("/_authenticated/markets")({
  head: () => ({
    meta: [
      { title: "Markets — Vanti" },
      { name: "description", content: "All Vanti virtual-money prediction markets." },
      { property: "og:title", content: "Markets — Vanti" },
      { property: "og:description", content: "All Vanti virtual-money prediction markets." },
    ],
  }),
  component: () => (
    <PageStub
      title="Markets"
      description="Every open market with YES/NO pricing, volume and resolution details."
    />
  ),
});