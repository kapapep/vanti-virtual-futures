import { useEffect } from "react";

/* ─────────────────────────────────────────────
   VantiIntro — launch animation overlay.

   ONE NUMBER TO TUNE: HANDOFF_Y.
   It's how far up the mark travels to land on the onboarding header.
   Too high → make it less negative. Stops short → more negative.

   TIMING (ms)
     130   trails race down the edges
     830   impact at the vertex
     860   mark blooms out of the impact
    1500   "Vanti" converges
    2180   blue period lands
    2650   handoff begins
    3350   onComplete fires
   ───────────────────────────────────────────── */

interface VantiIntroProps {
  onExitStart?: () => void;
  onComplete?: () => void;
  runId?: number;
}

const WING_L = "M22.5 23 L37.6 34.2 L43.4 44 L33.15 44 Z";
const WING_R = "M77.5 23 L62.4 34.2 L56.6 44 L66.85 44 Z";
const BODY   = "M33.15 44 L43.4 44 L50 55.2 L56.6 44 L66.85 44 L50 77.2 Z";
const EDGE_L = "M22.5 23 L50 77.2";
const EDGE_R = "M77.5 23 L50 77.2";

const LIGHT = "#A9BDFB";
const DEEP  = "#5C7CFA";
const TRAIL = "#DCE4FF";

const HANDOFF_Y = -168;
const EXIT_AT   = 2650;
const DONE_AT   = 3350;

export default function VantiIntro({ onExitStart, onComplete, runId = 0 }: VantiIntroProps) {
  useEffect(() => {
    const a = window.setTimeout(() => onExitStart?.(), EXIT_AT);
    const b = window.setTimeout(() => onComplete?.(), DONE_AT);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [runId, onExitStart, onComplete]);

  return (
    <div className="vi-overlay" aria-hidden="true">
      <div className="vi-stage">
        <svg className="vi-mark" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="viBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={LIGHT} />
              <stop offset="100%" stopColor={DEEP} />
            </linearGradient>
          </defs>

          <path className="vi-trail vi-trail--left" d={EDGE_L} />
          <path className="vi-trail vi-trail--right" d={EDGE_R} />

          <g className="vi-sparkles">
            <circle className="vi-spark" cx="50" cy="77.2" r="12" />
            <circle className="vi-ring" cx="50" cy="77.2" r="14" />
            <circle className="vi-glow" cx="50" cy="77.2" r="20" />
          </g>

          <g className="vi-shape">
            <path className="vi-wing vi-wing--left" d={WING_L} />
            <path className="vi-body" d={BODY} />
            <path className="vi-wing vi-wing--right" d={WING_R} />
          </g>
        </svg>

        <div className="vi-word">
          <span className="vi-word-text">Vanti</span>
          <span className="vi-dot">.</span>
        </div>
      </div>

      <style>{`
        .vi-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          animation: viFade 420ms ease forwards;
          animation-delay: 2650ms;
        }
        .vi-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 22px;
          animation: viHandoff 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 2450ms;
        }
        .vi-mark {
          width: 120px;
          height: 120px;
          overflow: visible;
          filter: drop-shadow(0 0 26px rgba(92,124,250,.45));
          animation: viShrink 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 2450ms;
        }
        .vi-trail {
          fill: none;
          stroke: ${TRAIL};
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-dasharray: 12 64;
          opacity: 0;
          animation: viTrail 720ms ease-out forwards;
        }
        .vi-trail--left  { animation-delay: 130ms; }
        .vi-trail--right { animation-delay: 180ms; }
        .vi-sparkles {
          transform-origin: 50px 77.2px;
        }
        .vi-spark {
          fill: #fff;
          opacity: 0;
          transform-origin: center;
          animation: viSpark 640ms ease-out forwards;
          animation-delay: 830ms;
        }
        .vi-ring {
          fill: none;
          stroke: ${DEEP};
          stroke-width: 1.5;
          opacity: 0;
          transform-origin: center;
          animation: viRing 740ms ease-out forwards;
          animation-delay: 830ms;
        }
        .vi-glow {
          fill: ${DEEP};
          opacity: 0;
          animation: viGlow 360ms ease-out forwards;
          animation-delay: 830ms;
        }
        .vi-shape {
          opacity: 0;
          transform: scale(.35);
          transform-origin: 50px 77.2px;
          animation: viBloom 560ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 860ms;
        }
        .vi-body { fill: url(#viBodyGrad); }
        .vi-wing { fill: ${LIGHT}; }
        .vi-word {
          display: flex;
          align-items: baseline;
          gap: 2px;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-weight: 800;
          font-size: 38px;
          letter-spacing: .18em;
          color: #fff;
          text-indent: .18em;
        }
        .vi-word-text {
          opacity: 0;
          animation: viWord 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 1500ms;
        }
        .vi-dot {
          color: ${DEEP};
          opacity: 0;
          transform: scale(.2);
          transform-origin: center;
          animation: viDot 420ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 2180ms;
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
        @keyframes viBloom  { to { opacity:1; transform:scale(1); } }
        @keyframes viGlow   { to { opacity:1; } }
        @keyframes viWord   { to { opacity:1; letter-spacing:-.025em; text-indent:0; } }
        @keyframes viDot    { to { opacity:1; transform:scale(1); } }
        @keyframes viFade   { to { opacity:0; } }
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
