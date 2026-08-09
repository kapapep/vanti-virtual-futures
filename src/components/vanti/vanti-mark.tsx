import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type VantiMarkVariant = "onColor" | "light" | "dark" | "current";

const PATHS = {
  regular: {
    outer: "M10 11 L32 27 L50 58 L68 27 L90 11 L53 88 L47 88 Z",
    inner: "M24.420 41 L40.129 41 L50 58 L59.871 41 L75.584 41 L53 88 L47 88 Z",
  },
  optical: {
    outer: "M8 11 L34 29 L50 60 L66 29 L92 11 L55 88 L45 88 Z",
    inner: "M22.420 41 L40.194 41 L50 60 L59.806 41 L77.584 41 L55 88 L45 88 Z",
  },
} as const;

const FILLS: Record<Exclude<VantiMarkVariant, "current">, { outer: string; inner: string }> = {
  onColor: { outer: "rgba(255,255,255,0.55)", inner: "#FFFFFF" },
  light: { outer: "#8E9FE8", inner: "#1C3AD6" },
  dark: { outer: "#3E4C8F", inner: "#5C7BFF" },
};

/** Tracks the active theme so the mark defaults to the matching variant. */
function useThemeVariant(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.classList.contains("light") ? "light" : "dark");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function VantiMark({
  size = 22,
  variant,
  className,
  title,
}: {
  size?: number;
  variant?: VantiMarkVariant;
  className?: string;
  title?: string;
}) {
  const themeVariant = useThemeVariant();
  const resolved = variant ?? themeVariant;

  const paths = size < 24 ? PATHS.optical : PATHS.regular;
  const outerOnly = size < 16;
  const fills = resolved === "current" ? null : FILLS[resolved];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={paths.outer} fill={outerOnly || !fills ? "currentColor" : fills.outer} />
      {outerOnly ? null : (
        <path d={paths.inner} fill={fills ? fills.inner : "currentColor"} />
      )}
    </svg>
  );
}
