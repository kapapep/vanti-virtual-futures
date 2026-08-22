import { useEffect } from "react";

/* ─────────────────────────────────────────────
   VantiIntro v4 — hands off to the real onboarding screen.

   TIMING (ms)
     130   trails race down the edges
     830   impact at the vertex
     860   mark blooms
    1500   "Vanti" converges
    2180   blue period lands
    2650   handoff begins
    3350   intro unmounts
   ───────────────────────────────────────────── */

const WING_L = "M22.5 23 L37.6 34.2 L43.4 44 L33.15 44 Z";
const WING_R = "M77.5 23 L62.4 34.2 L56.6 44 L66.85 44 Z";
const BODY = "M33.15 44 L43.4 44 L50 55.2 L56.6 44 L66.85 44 L50 77.2 Z";
const EDGE_L = "M22.5 23 L50 77.2";
const EDGE_R = "M77.5 23 L50 77.2";

const LIGHT = "#A9BDFB";
const DEEP = "#5C7CFA";
const TRAIL = "#DCE4FF";

const HANDOFF_Y = -168; // px the mark travels up to meet the onboarding header
const EXIT_AT = 2650;
const DONE_AT = 3350;

export interface VantiIntroProps {
  onExitStart?: () => void;
  onComplete?: () => void;
  runId?: string | number;
}

export default function VantiIntro({ onExitStart, onComplete, runId }: VantiIntroProps) {
  useEffect(() => {
    const a = setTimeout(() => onExitStart?.(), EXIT_AT);
    const b = setTimeout(() => onComplete?.(), DONE_AT);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [runId, onExitStart, onComplete]);

  return (
    <div
      key={runId}
      className="vi-root"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
      }}
    >
      <div className="vi-glow" />

      <div className="vi-stack">
        <svg className="vi-mark" viewBox="0 0 100 100" fill="none">
          <path
            className="vi-trail vi-trail-l"
            d={EDGE_L}
            stroke={TRAIL}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            className="vi-trail vi-trail-r"
            d={EDGE_R}
            stroke={TRAIL}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle
            className="vi-ring"
            cx="50"
            cy="77.2"
            r="3"
            stroke={TRAIL}
            strokeWidth="2"
            fill="none"
          />
          <circle className="vi-spark" cx="50" cy="77.2" r="5" fill="#FFFFFF" />
          <path className="vi-body" d={BODY} fill={DEEP} />
          <path className="vi-wing vi-wing-l" d={WING_L} fill={LIGHT} />
          <path className="vi-wing vi-wing-r" d={WING_R} fill={LIGHT} />
        </svg>

        <div className="vi-word">
          <span className="vi-word-text">Vanti</span>
          <span className="vi-dot">.</span>
        </div>
      </div>

    </div>
  );
}
