import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[1.35rem] font-semibold tracking-[-0.04em] text-foreground select-none",
        className,
      )}
    >
      Vanti
      <span className="text-accent-solid">.</span>
    </span>
  );
}