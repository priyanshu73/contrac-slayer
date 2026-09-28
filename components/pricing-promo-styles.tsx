"use client"

// Original sale effects from Johnson Subedi's e36840e pricing commit.
export function PricingPromoStyles() {
  return <style>{`
        @keyframes launchRibbonShift {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes diagonalStrikeDraw {
          from { transform: rotate(-14deg) scaleX(0); }
          to { transform: rotate(-14deg) scaleX(1); }
        }
        @keyframes promoPriceShine {
          0%, 55% { background-position: 110% 0; }
          85%, 100% { background-position: -60% 0; }
        }
        .launch-ribbon {
          background: linear-gradient(100deg, oklch(0.55 0.18 240), oklch(0.62 0.2 280), oklch(0.55 0.18 240));
          background-size: 200% 100%;
          animation: launchRibbonShift 4s linear infinite;
          box-shadow: 0 4px 18px oklch(0.55 0.18 240 / 0.35);
        }
        .diagonal-strike {
          position: relative;
        }
        .diagonal-strike::after {
          content: "";
          position: absolute;
          left: -8%;
          top: 50%;
          width: 116%;
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(90deg, oklch(0.58 0.22 27), oklch(0.62 0.24 27));
          transform-origin: left center;
          transform: rotate(-14deg);
          animation: diagonalStrikeDraw 0.7s cubic-bezier(0.6, 0, 0.2, 1) backwards;
          box-shadow: 0 0 6px oklch(0.58 0.22 27 / 0.4);
        }
        .diagonal-strike.strike-delay-1::after { animation-delay: 0.35s; }
        .diagonal-strike.strike-delay-2::after { animation-delay: 0.65s; }
        .diagonal-strike-sm {
          position: relative;
        }
        .diagonal-strike-sm::after {
          content: "";
          position: absolute;
          left: -6%;
          top: 52%;
          width: 112%;
          height: 2px;
          border-radius: 2px;
          background: oklch(0.58 0.22 27 / 0.8);
          transform: rotate(-10deg);
        }
        .shine-price {
          background: linear-gradient(100deg, var(--foreground) 40%, oklch(0.55 0.18 240) 50%, var(--foreground) 60%);
          background-size: 250% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: promoPriceShine 5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .launch-ribbon,
          .diagonal-strike::after,
          .shine-price {
            animation: none !important;
          }
          .shine-price {
            background: none;
            color: var(--foreground);
          }
        }
      `}</style>
}

