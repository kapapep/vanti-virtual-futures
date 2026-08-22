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
    <div key={runId} className="vi-root">
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

      <style>{`
        .vi-root {
          position: fixed; inset: 0; z-index: 60;
          display: flex; align-items: center; justify-content: center;
          background: #000;
          animation: viFade 640ms cubic-bezier(.4,0,.3,1) ${EXIT_AT + 120}ms forwards;
        }
        .vi-glow {
          position: absolute; width: 460px; height: 460px; border-radius: 50%;
          background: radial-gradient(circle, rgba(122,150,255,.30) 0%, transparent 62%);
          opacity: 0;
          animation: viGlow 1500ms cubic-bezier(.16,1,.3,1) 700ms forwards,
                     viFade 400ms ease-out ${EXIT_AT}ms forwards;
        }
        .vi-stack {
          position: relative; display: flex; flex-direction: column;
          align-items: center; gap: 24px;
          animation: viHandoff 760ms cubic-bezier(.32,0,.16,1) ${EXIT_AT}ms forwards;
        }
        .vi-mark {
          width: 116px; height: 116px; overflow: visible;
          filter: drop-shadow(0 0 14px rgba(92,124,250,.35));
          animation: viShrink 760ms cubic-bezier(.32,0,.16,1) ${EXIT_AT}ms forwards;
        }

        .vi-trail {
          stroke-dasharray: 15 200; stroke-dashoffset: 15; opacity: 0;
          animation: viTrail 720ms cubic-bezier(.5,0,.85,.35) 130ms forwards;
        }
        .vi-trail-r { animation-delay: 190ms; }

        .vi-ring, .vi-spark {
          transform-box: view-box; transform-origin: 50px 77.2px;
          opacity: 0; transform: scale(.2);
        }
        .vi-ring  { animation: viRing 620ms cubic-bezier(.16,1,.3,1) 850ms forwards; }
        .vi-spark { animation: viSpark 420ms cubic-bezier(.16,1,.3,1) 830ms forwards; }

        .vi-body, .vi-wing {
          transform-box: view-box; transform-origin: 50px 77.2px;
          opacity: 0; transform: scale(0);
        }
        .vi-body   { animation: viBloom 760ms cubic-bezier(.2,1.28,.4,1) 860ms forwards; }
        .vi-wing-l { animation: viBloom 720ms cubic-bezier(.2,1.24,.4,1) 1000ms forwards; }
        .vi-wing-r { animation: viBloom 720ms cubic-bezier(.2,1.24,.4,1) 1070ms forwards; }

        .vi-word {
          display: inline-flex; align-items: baseline;
          font-family: 'Figtree', ui-sans-serif, system-ui, sans-serif;
          font-size: 34px; font-weight: 700;
        }
        .vi-word-text {
          color: #FFF; opacity: 0;
          letter-spacing: .55em; text-indent: .55em;
          animation: viWord 780ms cubic-bezier(.16,1,.3,1) 1500ms forwards;
        }
        .vi-dot {
          color: ${DEEP}; opacity: 0;
          display: inline-block; transform-origin: 50% 85%; transform: scale(0);
          animation: viDot 460ms cubic-bezier(.2,1.5,.4,1) 2180ms forwards,
                     viFade 320ms ease-out ${EXIT_AT}ms forwards;
        }

        @keyframes viTrail {
          0% { opacity:0; stroke-dashoffset:15; } 18% { opacity:1; }
          85% { opacity:1; } 100% { opacity:0; stroke-dashoffset:-61; }
        }
        @keyframes viSpark {
          0% { opacity:0; transform:scale(.15); } 22% { opacity:.95; transform:scale(.6); }
          100% { opacity:0; transform:scale(2.2); }
        }
        @keyframes viRing {
          0% { opacity:0; transform:scale(.2); } 25% { opacity:.7; }
          100% { opacity:0; transform:scale(5); }
        }
        @keyframes viBloom { to { opacity:1; transform:scale(1); } }
        @keyframes viGlow  { to { opacity:1; } }
        @keyframes viWord  { to { opacity:1; letter-spacing:-.025em; text-indent:0; } }
        @keyframes viDot   { to { opacity:1; transform:scale(1); } }
        @keyframes viFade  { to { opacity:0; } }
        @keyframes viShrink { to { width:64px; height:64px; filter:drop-shadow(0 0 0 transparent); } }
        @keyframes viHandoff { to { transform: translateY(${HANDOFF_Y}px); gap: 10px; } }

        @media (prefers-reduced-motion: reduce) {
          .vi-trail, .vi-ring, .vi-spark { display: none; }
          .vi-body, .vi-wing, .vi-glow, .vi-word-text, .vi-dot {
            animation-duration: 240ms !important; animation-delay: 0ms !important;
          }
        }
      `}</style>
    </div>
  );
}
