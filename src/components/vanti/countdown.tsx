import { useEffect, useState } from "react";

/** Ticking "2d 04h 11m" style countdown to a timestamp. */
export function formatCountdown(target: string | Date): string {
  const ms = (typeof target === "string" ? new Date(target) : target).getTime() - Date.now();
  if (ms <= 0) return "Locked";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function Countdown({ to, className }: { to: string; className?: string }) {
  const [label, setLabel] = useState(() => formatCountdown(to));

  useEffect(() => {
    setLabel(formatCountdown(to));
    const id = window.setInterval(() => setLabel(formatCountdown(to)), 1000);
    return () => window.clearInterval(id);
  }, [to]);

  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}