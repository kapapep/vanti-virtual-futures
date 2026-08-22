import { useEffect } from "react";

/* ─────────────────────────────────────────────
   VantiIntro v4 — hands off to the real onboarding screen.

   The intro's mark + wordmark shrink and travel up to land exactly
   on the header of your onboarding screen, then cross-dissolve into it.
   Everything else on the page rises in beneath.

   ONE NUMBER TO TUNE: HANDOFF_Y below.
   If the mark drifts too high or low as it lands, adjust it.

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
const BODY   = "M33.15 44 L43.4 44 L50 55.2 L56.6 44 L66.85 44 L50 77.2 Z";
const EDGE_L = "M22.5 23 L50 77.2";
const EDGE_R = "M77.5 23 L50 77.2";

const LIGHT = "#A9BDFB";
const DEEP  = "#5C7CFA";
const TRAIL = "#DCE4FF";

const HANDOFF_Y = -168;   // px the mark travels up to meet the onboarding header
const EXIT_AT   = 2650;
const DONE_AT   = 3350;

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
    


      



      


        
          
          
          
          
          
          
        

        


          Vanti
          .
        

      


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
