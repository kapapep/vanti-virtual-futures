import type { CSSProperties } from "react";

/** The Vanti vane: two strokes meeting at a point. Used as a chart/tick cap marker. */
export function VaneChevron({
  size = 14,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d="M2 11L8 5L14 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}