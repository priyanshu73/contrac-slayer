"use client"

import { useEffect, useState } from "react"

/**
 * LandingLoader
 *
 * Flat, logo-accurate assembly animation on a solid black background.
 * Exit: hammer dissolves → bg dissolves → onCurtainDone fires.
 */
export function LandingLoader({
  exiting = false,
  onCurtainDone,
}: {
  exiting?: boolean
  onCurtainDone?: () => void
}) {
  const [stage, setStage] = useState(0)
  const [hammerGone, setHammerGone] = useState(false)
  const [bgGone, setBgGone] = useState(false)
  const [showDebris, setShowDebris] = useState(false)

  /* ── assembly timeline ── */
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 100),
      setTimeout(() => setStage(2), 400),
      setTimeout(() => setStage(3), 700),
      setTimeout(() => setStage(4), 1000),
      setTimeout(() => setStage(5), 1400),
      setTimeout(() => setStage(6), 1700),
      // Debris appears at impact moment (hammer swings to +18° at 55% of 0.9s hit = ~0.5s after stage 6)
      setTimeout(() => setShowDebris(true), 2150),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  /* ── exit: hammer dissolves first, then bg dissolves ── */
  useEffect(() => {
    if (!exiting) return
    const t1 = setTimeout(() => setHammerGone(true), 50)
    const t2 = setTimeout(() => setBgGone(true), 600)
    const t3 = setTimeout(() => onCurtainDone?.(), 1350)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [exiting, onCurtainDone])

  /* ── colors ── */
  const HEAD = "#F0F2F5"
  const BOLT = "#1A73E8"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "#0a0a0f",
        opacity: bgGone ? 0 : 1,
        transition: "opacity 0.7s ease",
        pointerEvents: bgGone ? "none" : "auto",
      }}
    >
      <div
        style={{
          opacity: hammerGone ? 0 : 1,
          transform: hammerGone ? "scale(0.92)" : "scale(1)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          pointerEvents: "none",
        }}
      >
        <div className="relative w-20 sm:w-24 md:w-28 lg:w-32" style={{ aspectRatio: "6/7" }}>
          <svg viewBox="0 0 120 140" className="w-full h-full">
            <defs>
              <filter id="ll-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={BOLT} floodOpacity="0.35" />
              </filter>
            </defs>

            <style>{`
              @keyframes hammer-hit {
                0%   { transform: rotate(0deg); }
                30%  { transform: rotate(-22deg); }
                55%  { transform: rotate(18deg); }
                80%  { transform: rotate(-6deg); }
                100% { transform: rotate(0deg); }
              }
              .ll-hit {
                animation: hammer-hit 0.9s cubic-bezier(0.4, 0, 0.2, 1);
                transform-origin: 60px 60px;
                transform-box: fill-box;
              }
            `}</style>

            {/* HAMMER GROUP */}
            <g className={stage >= 6 ? "ll-hit" : undefined}>

              {/* ── HEAD BODY — wide rectangle, the central pillar ── */}
              <g
                style={{
                  transform: stage >= 1 ? "translate(0, 0)" : "translate(0, -45px)",
                  opacity: stage >= 1 ? 1 : 0,
                  transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <rect x="40" y="30" width="36" height="28" rx="2" fill={HEAD} />
              </g>

              {/* ── CLAW — curved left hook with V-fork, matching the logo ── */}
              <g
                style={{
                  transform: stage >= 2 ? "translate(0, 0)" : "translate(-45px, 0)",
                  opacity: stage >= 2 ? 1 : 0,
                  transition: "all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <path
                  d={`
                    M 42 30
                    C 28 26, 16 30, 12 40
                    C  9 48, 12 56, 18 58
                    L 24 44
                    L 30 58
                    L 42 58
                    Z
                  `}
                  fill={HEAD}
                />
              </g>

              {/* ── STRIKING FACE — rounded right knob ── */}
              <g
                style={{
                  transform: stage >= 3 ? "translate(0, 0)" : "translate(38px, 0)",
                  opacity: stage >= 3 ? 1 : 0,
                  transition: "all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <path
                  d={`
                    M 74 30
                    L 88 30
                    C 96 30, 100 36, 100 44
                    C 100 52, 96 58, 88 58
                    L 74 58
                    Z
                  `}
                  fill={HEAD}
                />
              </g>

              {/* ── LIGHTNING BOLT — bold zigzag, flat top docks to head ── */}
              <g
                style={{
                  transform: stage >= 4 ? "translate(0, 0)" : "translate(0, 40px)",
                  opacity: stage >= 4 ? 1 : 0,
                  transition: "all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)",
                }}
                filter="url(#ll-glow)"
              >
                <path
                  d={`
                    M 44 58
                    L 74 58
                    L 56 86
                    L 74 86
                    L 36 136
                    L 50 98
                    L 32 98
                    Z
                  `}
                  fill={BOLT}
                />
              </g>
            </g>
          </svg>
        </div>

        {/* Impact debris — CSS-animated white dots that scatter on mount */}
        {showDebris && (
          <>
            {[
              { x: 24, y: -28, size: 4, delay: 0,    dur: 0.5 },
              { x: 32, y: -16, size: 3, delay: 0.03, dur: 0.45 },
              { x: 36, y: -4,  size: 5, delay: 0.01, dur: 0.55 },
              { x: 30, y: 10,  size: 3, delay: 0.04, dur: 0.45 },
              { x: 22, y: 24,  size: 4, delay: 0.02, dur: 0.5 },
              { x: 16, y: -34, size: 3, delay: 0.06, dur: 0.4 },
              { x: 40, y: -8,  size: 3, delay: 0.05, dur: 0.42 },
              { x: 28, y: 30,  size: 3, delay: 0.03, dur: 0.48 },
              { x: 12, y: -20, size: 2, delay: 0.07, dur: 0.38 },
              { x: 18, y: 16,  size: 2, delay: 0.06, dur: 0.4 },
              { x: 34, y: -22, size: 3, delay: 0.02, dur: 0.5 },
              { x: 38, y: 14,  size: 2, delay: 0.04, dur: 0.44 },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  // Start near the striking face (roughly 75% right, 35% down in the container)
                  top: "35%",
                  left: "75%",
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  opacity: 0,
                  animation: `debris-fly ${p.dur}s ease-out ${p.delay}s forwards`,
                  // CSS custom properties for the destination
                  ["--dx" as string]: `${p.x}px`,
                  ["--dy" as string]: `${p.y}px`,
                }}
              />
            ))}
            <style>{`
              @keyframes debris-fly {
                0% {
                  opacity: 1;
                  transform: translate(0, 0) scale(1);
                }
                100% {
                  opacity: 0;
                  transform: translate(var(--dx), var(--dy)) scale(0.2);
                }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  )
}
