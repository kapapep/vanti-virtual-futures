import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Back control for any non-tab screen. Steps back through history when there is
 * somewhere to return to, otherwise falls back to the feed so the button is
 * never a dead end (deep links, refreshes, shared URLs).
 */
export function BackButton({
  className,
  label = "Back",
  showLabel = false,
}: {
  className?: string;
  label?: string;
  showLabel?: boolean;
}) {
  const router = useRouter();

  function goBack() {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }
    void router.navigate({ to: "/home", search: { tab: "for-you" }, replace: true });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={goBack}
      aria-label={label}
      className={cn(
        "-ml-2 h-11 gap-1 px-2 text-sm font-medium text-foreground",
        showLabel ? "" : "w-11 justify-center px-0",
        className,
      )}
    >
      <ChevronLeft className="size-5 shrink-0" />
      {showLabel ? <span className="truncate">{label}</span> : null}
    </Button>
  );
}
