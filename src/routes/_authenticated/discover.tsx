import { createFileRoute, redirect } from "@tanstack/react-router";

/** Discover merged into Markets; kept as a redirect so old deep links still work. */
export const Route = createFileRoute("/_authenticated/discover")({
  beforeLoad: () => {
    throw redirect({ to: "/markets", replace: true });
  },
});
