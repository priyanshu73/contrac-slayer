"use client"

import { useEffect, useState } from "react"

export function Loader() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    // Stage 0: Initial
    // Stage 1: Hammer head flies in from left
    // Stage 2: Hammer handle slides in from bottom
    // Stage 3: Claw docks from right
    // Stage 4: Lightning bolt assembles
    // Stage 5: Everything assembled, start idle animation
    const timers = [
      setTimeout(() => setStage(1), 100),
      setTimeout(() => setStage(2), 400),
      setTimeout(() => setStage(3), 700),
      setTimeout(() => setStage(4), 1000),
      setTimeout(() => setStage(5), 1400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="relative w-32 h-36">
        <svg viewBox="0 0 120 140" className="w-full h-full">
          <defs>
            {/* Hammer head gradient - dark slate */}
            <linearGradient id="hammerHeadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a6572" />
              <stop offset="30%" stopColor="#344955" />
              <stop offset="70%" stopColor="#2c3e50" />
              <stop offset="100%" stopColor="#1a252f" />
            </linearGradient>
            
            {/* Handle gradient */}
            <linearGradient id="handleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3d5a6c" />
              <stop offset="50%" stopColor="#2c4251" />
              <stop offset="100%" stopColor="#3d5a6c" />
            </linearGradient>

            {/* Claw gradient */}
            <linearGradient id="clawGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a6572" />
              <stop offset="50%" stopColor="#2c3e50" />
              <stop offset="100%" stopColor="#1a252f" />
            </linearGradient>

            {/* Bolt gradient - bright blue */}
            <linearGradient id="boltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60b5ff" />
              <stop offset="40%" stopColor="#2196F3" />
              <stop offset="100%" stopColor="#1565C0" />
            </linearGradient>

            {/* 3D shine effect */}
            <linearGradient id="shineOverlay" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="30%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </linearGradient>

            {/* Static shine for 3D effect */}
            <linearGradient id="movingShine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Drop shadow */}
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* HAMMER HEAD - main rectangular body */}
          <g
            style={{
              transform: stage >= 1 ? "translate(0, 0)" : "translate(-60px, -20px)",
              opacity: stage >= 1 ? 1 : 0,
              transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            filter="url(#shadow)"
          >
            {/* Main head body */}
            <path
              d="M25 10 
                 L55 10 
                 Q60 10 62 15 
                 L62 35 
                 Q60 40 55 40 
                 L25 40 
                 Q20 40 18 35 
                 L18 15 
                 Q20 10 25 10 Z"
              fill="url(#hammerHeadGradient)"
            />
            {/* 3D top face */}
            <path
              d="M25 10 L55 10 Q60 10 62 15 L58 12 Q56 8 52 8 L28 8 Q24 8 22 12 L18 15 Q20 10 25 10 Z"
              fill="rgba(255,255,255,0.15)"
            />
            {/* Shine */}
            <path
              d="M25 10 L55 10 Q60 10 62 15 L62 35 Q60 40 55 40 L25 40 Q20 40 18 35 L18 15 Q20 10 25 10 Z"
              fill="url(#movingShine)"
            />
          </g>

          {/* HAMMER HANDLE - center grip */}
          <g
            style={{
              transform: stage >= 2 ? "translate(0, 0)" : "translate(0, 30px)",
              opacity: stage >= 2 ? 1 : 0,
              transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transitionDelay: "0.1s",
            }}
            filter="url(#shadow)"
          >
            {/* Handle neck */}
            <rect x="35" y="38" width="10" height="12" rx="1" fill="url(#handleGradient)" />
            {/* Handle grip ridges */}
            <rect x="35" y="42" width="10" height="2" fill="rgba(0,0,0,0.2)" />
            <rect x="35" y="46" width="10" height="2" fill="rgba(0,0,0,0.2)" />
            {/* Shine on handle */}
            <rect x="36" y="38" width="2" height="12" fill="rgba(255,255,255,0.2)" rx="1" />
          </g>

          {/* CLAW - curved prong */}
          <g
            style={{
              transform: stage >= 3 ? "translate(0, 0)" : "translate(40px, -10px)",
              opacity: stage >= 3 ? 1 : 0,
              transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            filter="url(#shadow)"
          >
            {/* Claw body */}
            <path
              d="M60 18 
                 Q65 16 72 12 
                 Q78 8 85 10 
                 Q88 12 87 16 
                 Q85 20 80 24 
                 Q74 28 68 30 
                 Q64 31 62 30
                 L62 22
                 Q62 19 60 18 Z"
              fill="url(#clawGradient)"
            />
            {/* Claw highlight */}
            <path
              d="M62 18 Q67 15 74 11 Q78 9 82 11"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* LIGHTNING BOLT - 3 pieces that dock together */}
          {/* Top piece */}
          <g
            style={{
              transform: stage >= 4 ? "translate(0, 0)" : "translate(15px, -20px) rotate(15deg)",
              opacity: stage >= 4 ? 1 : 0,
              transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transformOrigin: "50px 70px",
            }}
          >
            <path
              d="M52 50 L35 75 L48 75 L45 78 L58 78 L62 72 L50 72 L65 50 Z"
              fill="url(#boltGradient)"
              filter="url(#glow)"
            />
            <path
              d="M52 50 L50 72 L65 50 Z"
              fill="rgba(255,255,255,0.25)"
            />
          </g>

          {/* Middle connector piece */}
          <g
            style={{
              transform: stage >= 4 ? "translate(0, 0)" : "translate(-10px, 0)",
              opacity: stage >= 4 ? 1 : 0,
              transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transitionDelay: "0.1s",
            }}
          >
            <path
              d="M45 78 L48 75 L35 75 L30 85 L45 85 Z"
              fill="url(#boltGradient)"
              filter="url(#glow)"
            />
            <path
              d="M36 76 L32 83 L42 83 L45 78 Z"
              fill="rgba(255,255,255,0.15)"
            />
          </g>

          {/* Bottom spike piece */}
          <g
            style={{
              transform: stage >= 4 ? "translate(0, 0)" : "translate(-5px, 25px) rotate(-10deg)",
              opacity: stage >= 4 ? 1 : 0,
              transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transitionDelay: "0.2s",
              transformOrigin: "40px 100px",
            }}
          >
            <path
              d="M30 85 L45 85 L55 95 L38 95 L32 130 L50 100 L38 100 Z"
              fill="url(#boltGradient)"
              filter="url(#glow)"
            />
            <path
              d="M38 87 L50 95 L38 95 L34 120 L46 100 L38 100 Z"
              fill="rgba(255,255,255,0.2)"
            />
          </g>

          {/* Sparkles that appear after assembly - single flash */}
          {stage >= 5 && (
            <>
              <circle cx="75" cy="25" r="2" fill="#60b5ff" opacity="0.8" />
              <circle cx="20" cy="70" r="1.5" fill="#60b5ff" opacity="0.6" />
              <circle cx="70" cy="110" r="1.5" fill="#90caf9" opacity="0.7" />
              <circle cx="15" cy="30" r="1" fill="#b3e5fc" opacity="0.5" />
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
