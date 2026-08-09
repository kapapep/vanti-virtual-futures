import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "text-sm font-medium tracking-[-0.03em]",
  md: "text-[1.35rem] font-semibold tracking-[-0.04em]",
  lg: "text-2xl font-semibold tracking-[-0.04em]",
} as const;

export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "text-foreground select-none",
        sizeClasses[size],
        className,
      )}
    >
      Vanti
      <span className="text-accent-solid">.</span>
    </span>
  );
}

