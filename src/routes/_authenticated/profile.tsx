import { createFileRoute, Navigate } from "@tanstack/react-router";

import { EmptyState } from "@/components/vanti/empty-state";
import { useProfile } from "@/hooks/use-vanti-session";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Vanti" },
      { name: "description", content: "Your Vanti profile, trade record and positions." },
      { property: "og:title", content: "Your profile — Vanti" },
      {
        property: "og:description",
        content: "Your Vanti profile, trade record and positions.",
      },
    ],
  }),
  component: OwnProfileRedirect,
});

/** /profile is a shortcut to the signed-in user's public profile page. */
function OwnProfileRedirect() {
  const { data: profile, isPending } = useProfile();

  if (isPending) return <EmptyState title="Loading your profile…" />;
  if (!profile) return <EmptyState title="We couldn't load your profile. Try reloading." />;

  return <Navigate to="/u/$username" params={{ username: profile.username }} replace />;
}
