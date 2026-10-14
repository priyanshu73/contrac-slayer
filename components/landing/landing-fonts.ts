import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google"

const display = Inter_Tight({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--lp-display", display: "swap" })
const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--lp-sans", display: "swap" })
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--lp-mono", display: "swap" })

export const landingFontClass = `${display.variable} ${sans.variable} ${mono.variable}`
