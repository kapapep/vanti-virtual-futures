import { createFileRoute, redirect } from "@tanstack/react-router";

/** Balance merged into Portfolio. Kept so old deep links still resolve. */
export const Route = createFileRoute("/_authenticated/balance")({
  beforeLoad: () => {
    throw redirect({ to: "/portfolio", replace: true });
  },
});
