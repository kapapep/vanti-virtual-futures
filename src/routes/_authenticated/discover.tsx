import { createFileRoute } from "@tanstack/react-router";

import { PageStub } from "@/components/vanti/app-shell";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Vanti" },
      { name: "description", content: "Browse Vanti categories and trending virtual markets." },
      { property: "og:title", content: "Discover — Vanti" },
      {
        property: "og:description",
        content: "Browse Vanti categories and trending virtual markets.",
      },
    ],
  }),
  component: () => (
    <PageStub
      title="Discover"
      description="Explore categories, trending questions and newly opened markets."
    />
  ),
});
