import { useEffect } from "react";

/* ─────────────────────────────────────────────
   VantiIntro v4 — hands off to the real onboarding screen.

   ONE NUMBER TO TUNE: HANDOFF_Y below.

   TIMING (ms)
     130   trails race down the edges
     830   impact at the vertex
     860   mark blooms
    1500   "Vanti" converges
    2180   blue period lands
    2650   handoff begins
    3350   intro unmounts
   ───────────────────────────────────────────── */

interface VantiIntroProps {
  onExitStart?: () => void;
  onComplete?: () => void;
  runId?: number;
}

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

export default function VantiIntro({ onExitStart, onComplete, runId = 0 }: VantiIntroProps) {
  useEffect(() => {
    const a = window.setTimeout(() => onExitStart?.(), EXIT_AT);
    const b = window.setTimeout(() => onComplete?.(), DONE_AT);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [runId, onExitStart, onComplete]);

  return (
    <div className="vi-root" key={runId}>
      <div className="vi-stack">
        <div className="vi-mark">
          <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
            <path className="vi-glow" d={BODY} fill={DEEP} />
            <path className="vi-wing vi-wing-l" d={WING_L} fill={LIGHT} />
            <path className="vi-wing vi-wing-r" d={WING_R} fill={LIGHT} />
            <path className="vi-body" d={BODY} fill={DEEP} />
            <path className="vi-trail vi-trail-l" d={EDGE_L} stroke={TRAIL} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path className="vi-trail vi-trail-r" d={EDGE_R} stroke={TRAIL} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <circle className="vi-ring" cx="50" cy="77.2" r="6" stroke={TRAIL} strokeWidth="1" fill="none" />
            <circle className="vi-spark" cx="50" cy="77.2" r="7" fill={TRAIL} />
          </svg>
        </div>

        <div className="vi-word">
          <span className="vi-word-text">Vanti</span>
          <span className="vi-dot">.</span>
        </div>
      </div>

      <style>{`
        .vi-root {
          position: fixed; inset: 0; z-index: 2147483647;
          display: flex; align-items: center; justify-content: center;
          background: #000;
          animation: viFade 500ms ease forwards ${EXIT_AT + 250}ms;
        }
        .vi-stack {
          display: flex; flex-direction: column; align-items: center; gap: 26px;
          animation: viHandoff 700ms cubic-bezier(.22,.9,.24,1) forwards ${EXIT_AT}ms;
        }
        .vi-mark {
          width: 148px; height: 148px;
          filter: drop-shadow(0 0 34px rgba(92,124,250,.45));
          animation: viShrink 700ms cubic-bezier(.22,.9,.24,1) forwards ${EXIT_AT}ms;
        }
        .vi-mark svg { display: block; overflow: visible; }

        .vi-glow { opacity: 0; filter: blur(9px);
          animation: viGlow 700ms ease forwards 860ms; }
        .vi-body, .vi-wing {
          opacity: 0; transform: scale(.7); transform-origin: 50px 55px;
          animation: viBloom 620ms cubic-bezier(.16,1,.3,1) forwards 860ms;
        }
        .vi-wing-l { animation-delay: 920ms; }
        .vi-wing-r { animation-delay: 960ms; }

        .vi-trail {
          stroke-dasharray: 15 61;
          animation: viTrail 760ms cubic-bezier(.5,0,.6,1) forwards 130ms;
        }
        .vi-ring  { opacity: 0; transform-origin: 50px 77.2px;
          animation: viRing 620ms ease-out forwards 830ms; }
        .vi-spark { opacity: 0; transform-origin: 50px 77.2px;
          animation: viSpark 520ms ease-out forwards 830ms; }

        .vi-word {
          display: flex; align-items: baseline;
          font-weight: 800; font-size: 46px; line-height: 1; color: #fff;
        }
        .vi-word-text {
          opacity: 0; letter-spacing: .4em; text-indent: .4em;
          animation: viWord 780ms cubic-bezier(.16,1,.3,1) forwards 1500ms;
        }
        .vi-dot { opacity: 0; transform: scale(.4); color: ${DEEP};
          animation: viDot 420ms cubic-bezier(.16,1,.3,1) forwards 2180ms; }

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
