import { createFileRoute } from "@tanstack/react-router";

import { PageStub } from "@/components/vanti/app-shell";
import { useProfile } from "@/hooks/use-vanti-session";
import { formatBalance } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Vanti" },
      { name: "description", content: "Your Vanti profile and virtual balance." },
      { property: "og:title", content: "Profile — Vanti" },
      { property: "og:description", content: "Your Vanti profile and virtual balance." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-surface p-6">
        <p className="text-meta font-medium uppercase text-muted-foreground">
          {profile ? `@${profile.username}` : "Loading"}
        </p>
        <h1 className="mt-1 text-figure font-semibold text-foreground">
          {profile?.display_name ?? profile?.username ?? "—"}
        </h1>
        <p className="num mt-6 text-display font-semibold text-foreground">
          {formatBalance(profile?.balance)}
        </p>
        <p className="text-meta text-muted-foreground">Virtual balance — not real money</p>
      </section>
      <PageStub
        title="Profile settings"
        description="Editing your display name, bio and avatar arrives with the social features."
      />
    </div>
  );
}