import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { lightHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const TRIGGER = 72;
const MAX_PULL = 110;

/**
 * Native-app style pull-to-refresh for window-scrolled pages. Only engages
 * when the page is already scrolled to the top and the gesture is vertical.
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
}: {
  onRefresh: () => Promise<unknown>;
  children: React.ReactNode;
  className?: string;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const active = useRef(false);
  const armed = useRef(false);
  const busy = useRef(false);

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    setPull(TRIGGER);
    try {
      await onRefresh();
    } finally {
      busy.current = false;
      setRefreshing(false);
      setPull(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (busy.current || e.touches.length !== 1) return;
      const t = e.touches[0]!;
      start.current = { x: t.clientX, y: t.clientY };
      active.current = window.scrollY <= 0;
      armed.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const s = start.current;
      if (!s || !active.current || busy.current) return;
      const t = e.touches[0]!;
      const dy = t.clientY - s.y;
      const dx = t.clientX - s.x;
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
        if (!armed.current) active.current = false;
        return;
      }
      armed.current = true;
      const eased = Math.min(MAX_PULL, dy * 0.5);
      setPull(eased);
    };

    const onTouchEnd = () => {
      const engaged = armed.current;
      start.current = null;
      active.current = false;
      armed.current = false;
      if (!engaged) return;
      setPull((current) => {
        if (current >= TRIGGER * 0.75) {
          void lightHaptic();
          void run();
          return TRIGGER;
        }
        return 0;
      });
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [run]);

  const progress = Math.min(1, pull / TRIGGER);

  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden={pull === 0}
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
        style={{
          height: pull,
          opacity: progress,
          transition: pull === 0 || refreshing ? "height 200ms ease-out, opacity 200ms" : "none",
        }}
      >
        <span className="mt-2 grid size-8 place-items-center rounded-full border border-border bg-card">
          <Loader2
            className={cn("size-4 text-muted-foreground", refreshing && "animate-spin")}
            style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          />
        </span>
      </div>
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: pull === 0 || refreshing ? "transform 200ms ease-out" : "none",
        }}
      >
        {children}
      </div>
      <span aria-live="polite" className="sr-only">
        {refreshing ? "Refreshing content" : ""}
      </span>
    </div>
  );
}
