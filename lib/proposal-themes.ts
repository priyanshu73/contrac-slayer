import type { ProposalThemeId } from "@/lib/types"

export interface ProposalThemeDefinition {
  id: ProposalThemeId
  name: string
  trade: string
  vibe: string
  description: string
  bestFor: string
  swatches: [string, string, string]
  canvasClassName: string
  selectorClassName: string
  selectorPreviewClassName: string
  selectorChipClassName: string
  coverCardClassName: string
  coverHeaderClassName: string
  coverPrimaryBadgeClassName: string
  coverSecondaryBadgeClassName: string
  coverMetaPanelClassName: string
  overviewCardClassName: string
  overviewBadgeClassName: string
  pageCardClassName: string
  pageHeaderClassName: string
  pageTitlePromptClassName: string
  pageTitleLabelClassName: string
  blockSurfaceClassName: string
  addActionsClassName: string
  richTextSurfaceClassName: string
  richTextToolbarClassName: string
  richTextEditorClassName: string
  readOnlyRichTextClassName: string
}

export const DEFAULT_PROPOSAL_THEME_ID: ProposalThemeId = "coastal"

export const PROPOSAL_THEMES: ProposalThemeDefinition[] = [
  {
    id: "coastal",
    name: "Coastal Glow",
    trade: "General",
    vibe: "Bright and polished",
    description: "A clean premium layout with airy blue highlights for residential quotes that should feel upscale without feeling flashy.",
    bestFor: "General contracting, kitchen upgrades, bathrooms, and premium home improvement work.",
    swatches: ["#0f172a", "#38bdf8", "#fbbf24"],
    canvasClassName:
      "bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.16),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef4f7_100%)]",
    selectorClassName: "border-sky-200 bg-white/90 hover:border-sky-300 hover:bg-white",
    selectorPreviewClassName:
      "border-sky-100 bg-[linear-gradient(135deg,rgba(224,242,254,0.95),rgba(255,255,255,0.94)_55%,rgba(254,240,138,0.42))]",
    selectorChipClassName: "bg-sky-500/12 text-sky-700 ring-1 ring-sky-200",
    coverCardClassName: "border-slate-200 bg-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.45)]",
    coverHeaderClassName:
      "border-slate-200 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(255,255,255,0.92)_38%,rgba(251,191,36,0.12))]",
    coverPrimaryBadgeClassName: "bg-slate-950 text-white",
    coverSecondaryBadgeClassName: "bg-white text-slate-700 shadow-sm",
    coverMetaPanelClassName: "border-slate-200 bg-slate-50/80 text-slate-600",
    overviewCardClassName: "border-slate-200 bg-white shadow-sm",
    overviewBadgeClassName: "border-slate-200 text-slate-500",
    pageCardClassName: "border-slate-200 bg-white shadow-sm",
    pageHeaderClassName:
      "border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(240,249,255,1))]",
    pageTitlePromptClassName:
      "border-slate-300 bg-white/85 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100",
    pageTitleLabelClassName: "text-slate-400",
    blockSurfaceClassName: "border-slate-200 bg-slate-50/80",
    addActionsClassName: "border-slate-300 bg-slate-50",
    richTextSurfaceClassName: "border-slate-200 bg-white",
    richTextToolbarClassName: "border-slate-200",
    richTextEditorClassName: "text-slate-700",
    readOnlyRichTextClassName: "prose-slate text-slate-700",
  },
  {
    id: "renovation",
    name: "Renovation Studio",
    trade: "Renovation",
    vibe: "Warm, structured, and architectural",
    description: "Neutral stone, brass warmth, and subtle plan-like rhythm for remodeling work that should feel organized and elevated.",
    bestFor: "Full remodels, interior renovation, design-build proposals, additions, and finish packages.",
    swatches: ["#292524", "#c2410c", "#e7e5e4"],
    canvasClassName:
      "bg-[radial-gradient(circle_at_top_left,_rgba(194,65,12,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(120,53,15,0.1),_transparent_24%),linear-gradient(180deg,#fafaf9_0%,#f1efec_100%)]",
    selectorClassName: "border-stone-300 bg-stone-50/90 hover:border-orange-300 hover:bg-white",
    selectorPreviewClassName:
      "border-stone-300 bg-[repeating-linear-gradient(90deg,rgba(68,64,60,0.08)_0_1px,transparent_1px_28px),linear-gradient(135deg,rgba(255,251,235,0.96),rgba(250,250,249,0.94)_56%,rgba(251,146,60,0.16))]",
    selectorChipClassName: "bg-orange-500/12 text-orange-800 ring-1 ring-orange-200",
    coverCardClassName: "border-stone-300 bg-[#fcfbf7] shadow-[0_24px_70px_-34px_rgba(41,37,36,0.36)]",
    coverHeaderClassName:
      "border-stone-300 bg-[repeating-linear-gradient(90deg,rgba(87,83,78,0.06)_0_1px,transparent_1px_36px),linear-gradient(135deg,rgba(255,251,235,0.94),rgba(255,255,255,0.96)_45%,rgba(251,146,60,0.12))]",
    coverPrimaryBadgeClassName: "bg-stone-950 text-white",
    coverSecondaryBadgeClassName: "bg-white text-stone-700 shadow-sm",
    coverMetaPanelClassName: "border-stone-200 bg-stone-100/70 text-stone-700",
    overviewCardClassName: "border-stone-300 bg-white shadow-sm",
    overviewBadgeClassName: "border-orange-200 text-orange-800 bg-orange-50",
    pageCardClassName: "border-stone-300 bg-white shadow-sm",
    pageHeaderClassName:
      "border-stone-300 bg-[linear-gradient(135deg,rgba(255,251,235,0.9),rgba(255,255,255,0.94)_46%,rgba(245,245,244,0.98))]",
    pageTitlePromptClassName:
      "border-stone-300 bg-white focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100",
    pageTitleLabelClassName: "text-stone-500",
    blockSurfaceClassName: "border-stone-200 bg-stone-50/70",
    addActionsClassName: "border-stone-300 bg-stone-100/80",
    richTextSurfaceClassName: "border-stone-200 bg-white",
    richTextToolbarClassName: "border-stone-200",
    richTextEditorClassName: "text-stone-700",
    readOnlyRichTextClassName: "prose-stone text-stone-700",
  },
  {
    id: "evergreen",
    name: "Evergreen Estate",
    trade: "Outdoor",
    vibe: "Warm and grounded",
    description: "Botanical greens and sandstone neutrals with a handcrafted feel for exterior upgrades and curb-appeal work.",
    bestFor: "Outdoor living, hardscaping, patios, fencing, decks, and mixed exterior improvement projects.",
    swatches: ["#14532d", "#84cc16", "#d6d3d1"],
    canvasClassName:
      "bg-[radial-gradient(circle_at_top,_rgba(132,204,22,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(20,83,45,0.14),_transparent_28%),linear-gradient(180deg,#f6f7f2_0%,#edf2e8_100%)]",
    selectorClassName: "border-emerald-200 bg-white/90 hover:border-lime-300 hover:bg-white",
    selectorPreviewClassName:
      "border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(255,251,235,0.92)_56%,rgba(190,242,100,0.34))]",
    selectorChipClassName: "bg-emerald-500/12 text-emerald-800 ring-1 ring-emerald-200",
    coverCardClassName: "border-emerald-200 bg-[#fffdf7] shadow-[0_24px_70px_-34px_rgba(20,83,45,0.28)]",
    coverHeaderClassName:
      "border-emerald-200 bg-[linear-gradient(135deg,rgba(20,83,45,0.1),rgba(255,253,247,0.95)_42%,rgba(132,204,22,0.16))]",
    coverPrimaryBadgeClassName: "bg-emerald-900 text-white",
    coverSecondaryBadgeClassName: "bg-white text-emerald-900 shadow-sm",
    coverMetaPanelClassName: "border-emerald-100 bg-emerald-50/60 text-emerald-900",
    overviewCardClassName: "border-emerald-200 bg-[#fffef8] shadow-sm",
    overviewBadgeClassName: "border-emerald-200 text-emerald-700 bg-emerald-50",
    pageCardClassName: "border-emerald-200 bg-[#fffef8] shadow-sm",
    pageHeaderClassName:
      "border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(255,253,247,0.95)_52%,rgba(240,253,244,0.95))]",
    pageTitlePromptClassName:
      "border-emerald-200 bg-white/90 focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-100",
    pageTitleLabelClassName: "text-emerald-600/70",
    blockSurfaceClassName: "border-emerald-100 bg-emerald-50/50",
    addActionsClassName: "border-emerald-200 bg-emerald-50/70",
    richTextSurfaceClassName: "border-emerald-100 bg-white",
    richTextToolbarClassName: "border-emerald-100",
    richTextEditorClassName: "text-emerald-950/80",
    readOnlyRichTextClassName: "prose-emerald text-emerald-950/80",
  },
  {
    id: "landscape",
    name: "Landscape Canopy",
    trade: "Landscaping",
    vibe: "Fresh, organic, and minimal",
    description: "Soft leaf forms, light wood-grain rhythm, and botanical greens give landscape proposals a calm garden-studio feel.",
    bestFor: "Landscaping, lawn transformations, planting plans, tree work, irrigation, and outdoor maintenance packages.",
    swatches: ["#166534", "#65a30d", "#a16207"],
    canvasClassName:
      "bg-[radial-gradient(ellipse_at_16%_18%,rgba(34,197,94,0.14),transparent_18%),radial-gradient(ellipse_at_82%_78%,rgba(132,204,22,0.12),transparent_20%),repeating-linear-gradient(105deg,rgba(161,98,7,0.04)_0_6px,transparent_6px_18px),linear-gradient(180deg,#f5f9f2_0%,#edf4ea_100%)]",
    selectorClassName: "border-lime-200 bg-white/90 hover:border-emerald-300 hover:bg-white",
    selectorPreviewClassName:
      "border-lime-200 bg-[radial-gradient(ellipse_at_18%_30%,rgba(34,197,94,0.2),transparent_16%),radial-gradient(ellipse_at_30%_18%,rgba(22,163,74,0.14),transparent_14%),radial-gradient(ellipse_at_78%_72%,rgba(190,242,100,0.24),transparent_20%),repeating-linear-gradient(105deg,rgba(161,98,7,0.06)_0_6px,transparent_6px_20px),linear-gradient(135deg,rgba(240,253,244,0.98),rgba(255,251,235,0.94)_60%,rgba(236,252,203,0.76))]",
    selectorChipClassName: "bg-lime-500/12 text-lime-800 ring-1 ring-lime-200",
    coverCardClassName: "border-lime-200 bg-[#fffef9] shadow-[0_24px_70px_-34px_rgba(22,101,52,0.26)]",
    coverHeaderClassName:
      "border-lime-200 bg-[radial-gradient(ellipse_at_16%_24%,rgba(34,197,94,0.14),transparent_16%),radial-gradient(ellipse_at_26%_14%,rgba(22,163,74,0.1),transparent_12%),radial-gradient(ellipse_at_82%_72%,rgba(132,204,22,0.14),transparent_18%),repeating-linear-gradient(105deg,rgba(161,98,7,0.05)_0_6px,transparent_6px_20px),linear-gradient(135deg,rgba(240,253,244,0.96),rgba(255,253,247,0.96)_46%,rgba(236,252,203,0.62))]",
    coverPrimaryBadgeClassName: "bg-emerald-900 text-white",
    coverSecondaryBadgeClassName: "bg-white text-emerald-900 shadow-sm",
    coverMetaPanelClassName: "border-lime-100 bg-lime-50/70 text-emerald-900",
    overviewCardClassName: "border-lime-200 bg-[#fffef8] shadow-sm",
    overviewBadgeClassName: "border-lime-200 text-lime-800 bg-lime-50",
    pageCardClassName: "border-lime-200 bg-[#fffef8] shadow-sm",
    pageHeaderClassName:
      "border-lime-200 bg-[radial-gradient(ellipse_at_14%_30%,rgba(34,197,94,0.12),transparent_14%),repeating-linear-gradient(105deg,rgba(161,98,7,0.05)_0_6px,transparent_6px_20px),linear-gradient(135deg,rgba(240,253,244,0.98),rgba(255,253,247,0.95)_52%,rgba(236,252,203,0.48))]",
    pageTitlePromptClassName:
      "border-lime-200 bg-white/90 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100",
    pageTitleLabelClassName: "text-emerald-700/70",
    blockSurfaceClassName: "border-lime-100 bg-lime-50/45",
    addActionsClassName: "border-lime-200 bg-lime-50/70",
    richTextSurfaceClassName: "border-lime-100 bg-white",
    richTextToolbarClassName: "border-lime-100",
    richTextEditorClassName: "text-emerald-950/80",
    readOnlyRichTextClassName: "prose-emerald text-emerald-950/80",
  },
  {
    id: "electric",
    name: "Electric Current",
    trade: "Electrical",
    vibe: "Sharp, technical, and confident",
    description: "Socket-inspired geometry, current-line rhythm, and energized amber highlights make technical scope feel crisp and precise.",
    bestFor: "Panel upgrades, rewiring, EV chargers, lighting plans, generators, and commercial electrical scopes.",
    swatches: ["#0f172a", "#f59e0b", "#cbd5e1"],
    canvasClassName:
      "bg-[radial-gradient(circle_at_16%_18%,rgba(245,158,11,0.14),transparent_18%),radial-gradient(circle_at_84%_22%,rgba(251,191,36,0.12),transparent_18%),repeating-linear-gradient(90deg,rgba(15,23,42,0.04)_0_2px,transparent_2px_28px),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]",
    selectorClassName: "border-amber-200 bg-white/90 hover:border-amber-300 hover:bg-white",
    selectorPreviewClassName:
      "border-amber-200 bg-[radial-gradient(circle_at_18%_38%,rgba(15,23,42,0.1)_0_8px,transparent_8px),radial-gradient(circle_at_18%_38%,rgba(245,158,11,0.22)_0_14px,transparent_14px),radial-gradient(circle_at_82%_32%,rgba(15,23,42,0.08)_0_8px,transparent_8px),radial-gradient(circle_at_82%_32%,rgba(251,191,36,0.18)_0_14px,transparent_14px),repeating-linear-gradient(90deg,rgba(15,23,42,0.08)_0_2px,transparent_2px_34px),linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,251,235,0.94)_60%,rgba(254,243,199,0.86))]",
    selectorChipClassName: "bg-amber-500/12 text-amber-800 ring-1 ring-amber-200",
    coverCardClassName: "border-slate-300 bg-[#fbfbfc] shadow-[0_24px_70px_-34px_rgba(15,23,42,0.34)]",
    coverHeaderClassName:
      "border-slate-300 bg-[radial-gradient(circle_at_16%_36%,rgba(15,23,42,0.08)_0_10px,transparent_10px),radial-gradient(circle_at_16%_36%,rgba(250,204,21,0.16)_0_18px,transparent_18px),radial-gradient(circle_at_82%_52%,rgba(15,23,42,0.06)_0_10px,transparent_10px),radial-gradient(circle_at_82%_52%,rgba(251,191,36,0.14)_0_18px,transparent_18px),repeating-linear-gradient(90deg,rgba(15,23,42,0.06)_0_2px,transparent_2px_36px),linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,251,235,0.96)_52%,rgba(254,249,195,0.62))]",
    coverPrimaryBadgeClassName: "bg-slate-950 text-white",
    coverSecondaryBadgeClassName: "bg-white text-slate-700 shadow-sm",
    coverMetaPanelClassName: "border-slate-200 bg-slate-100/70 text-slate-700",
    overviewCardClassName: "border-slate-300 bg-white shadow-sm",
    overviewBadgeClassName: "border-amber-200 text-amber-800 bg-amber-50",
    pageCardClassName: "border-slate-300 bg-white shadow-sm",
    pageHeaderClassName:
      "border-slate-300 bg-[radial-gradient(circle_at_14%_34%,rgba(250,204,21,0.14),transparent_14%),repeating-linear-gradient(90deg,rgba(15,23,42,0.06)_0_2px,transparent_2px_34px),linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,251,235,0.94)_48%,rgba(254,249,195,0.42))]",
    pageTitlePromptClassName:
      "border-slate-300 bg-white focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100",
    pageTitleLabelClassName: "text-slate-500",
    blockSurfaceClassName: "border-slate-200 bg-slate-50/75",
    addActionsClassName: "border-slate-300 bg-slate-100/85",
    richTextSurfaceClassName: "border-slate-200 bg-white",
    richTextToolbarClassName: "border-slate-200",
    richTextEditorClassName: "text-slate-800",
    readOnlyRichTextClassName: "prose-slate text-slate-800",
  },
  {
    id: "plumbing",
    name: "Plumbing Flow",
    trade: "Plumbing",
    vibe: "Clean, cool, and fluid",
    description: "Pipe-joint rings, hose-like runs, and crisp blue tones give plumbing work a technical but approachable presentation.",
    bestFor: "Pipe replacement, repipes, fixtures, drain scopes, water heater work, and service agreements.",
    swatches: ["#0f766e", "#38bdf8", "#cbd5e1"],
    canvasClassName:
      "bg-[radial-gradient(circle_at_16%_24%,rgba(56,189,248,0.14),transparent_16%),radial-gradient(circle_at_84%_74%,rgba(6,182,212,0.12),transparent_18%),repeating-linear-gradient(90deg,rgba(15,118,110,0.04)_0_14px,transparent_14px_32px),linear-gradient(180deg,#f6fbfd_0%,#edf5f8_100%)]",
    selectorClassName: "border-cyan-200 bg-white/90 hover:border-sky-300 hover:bg-white",
    selectorPreviewClassName:
      "border-cyan-200 bg-[radial-gradient(circle_at_14%_50%,rgba(14,165,233,0.14)_0_8px,transparent_8px),radial-gradient(circle_at_14%_50%,rgba(56,189,248,0.16)_0_16px,transparent_16px),radial-gradient(circle_at_48%_50%,rgba(14,165,233,0.12)_0_8px,transparent_8px),radial-gradient(circle_at_48%_50%,rgba(56,189,248,0.14)_0_16px,transparent_16px),radial-gradient(circle_at_82%_50%,rgba(14,165,233,0.14)_0_8px,transparent_8px),radial-gradient(circle_at_82%_50%,rgba(56,189,248,0.16)_0_16px,transparent_16px),repeating-linear-gradient(90deg,rgba(15,118,110,0.06)_0_14px,transparent_14px_34px),linear-gradient(135deg,rgba(240,249,255,0.98),rgba(255,255,255,0.94)_56%,rgba(207,250,254,0.86))]",
    selectorChipClassName: "bg-cyan-500/12 text-cyan-800 ring-1 ring-cyan-200",
    coverCardClassName: "border-cyan-200 bg-white shadow-[0_24px_70px_-34px_rgba(8,145,178,0.26)]",
    coverHeaderClassName:
      "border-cyan-200 bg-[radial-gradient(circle_at_16%_38%,rgba(14,165,233,0.12)_0_10px,transparent_10px),radial-gradient(circle_at_16%_38%,rgba(56,189,248,0.16)_0_18px,transparent_18px),radial-gradient(circle_at_50%_38%,rgba(14,165,233,0.1)_0_10px,transparent_10px),radial-gradient(circle_at_50%_38%,rgba(56,189,248,0.12)_0_18px,transparent_18px),radial-gradient(circle_at_84%_38%,rgba(14,165,233,0.12)_0_10px,transparent_10px),radial-gradient(circle_at_84%_38%,rgba(56,189,248,0.16)_0_18px,transparent_18px),repeating-linear-gradient(90deg,rgba(15,118,110,0.05)_0_14px,transparent_14px_38px),linear-gradient(135deg,rgba(240,249,255,0.98),rgba(255,255,255,0.96)_48%,rgba(207,250,254,0.66))]",
    coverPrimaryBadgeClassName: "bg-cyan-900 text-white",
    coverSecondaryBadgeClassName: "bg-white text-cyan-900 shadow-sm",
    coverMetaPanelClassName: "border-cyan-100 bg-cyan-50/70 text-cyan-900",
    overviewCardClassName: "border-cyan-200 bg-white shadow-sm",
    overviewBadgeClassName: "border-cyan-200 text-cyan-800 bg-cyan-50",
    pageCardClassName: "border-cyan-200 bg-white shadow-sm",
    pageHeaderClassName:
      "border-cyan-200 bg-[radial-gradient(circle_at_14%_36%,rgba(56,189,248,0.14)_0_12px,transparent_12px),repeating-linear-gradient(90deg,rgba(15,118,110,0.05)_0_14px,transparent_14px_34px),linear-gradient(135deg,rgba(240,249,255,0.98),rgba(255,255,255,0.95)_50%,rgba(207,250,254,0.48))]",
    pageTitlePromptClassName:
      "border-cyan-200 bg-white focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100",
    pageTitleLabelClassName: "text-cyan-700/70",
    blockSurfaceClassName: "border-cyan-100 bg-cyan-50/45",
    addActionsClassName: "border-cyan-200 bg-cyan-50/70",
    richTextSurfaceClassName: "border-cyan-100 bg-white",
    richTextToolbarClassName: "border-cyan-100",
    richTextEditorClassName: "text-slate-800",
    readOnlyRichTextClassName: "prose-cyan text-slate-800",
  },
  {
    id: "roofing",
    name: "Roofline Slate",
    trade: "Roofing",
    vibe: "Crisp, durable, and directional",
    description: "Diagonal slate-inspired rhythm and mineral tones give roofing proposals a sturdy, weather-ready feel.",
    bestFor: "Roof replacement, repairs, gutters, siding-adjacent scopes, and storm restoration packages.",
    swatches: ["#334155", "#b45309", "#e2e8f0"],
    canvasClassName:
      "bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(51,65,85,0.14),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef1f5_100%)]",
    selectorClassName: "border-slate-300 bg-white/90 hover:border-orange-300 hover:bg-white",
    selectorPreviewClassName:
      "border-slate-300 bg-[repeating-linear-gradient(135deg,rgba(51,65,85,0.08)_0_10px,transparent_10px_24px),linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,251,235,0.92)_58%,rgba(226,232,240,0.98))]",
    selectorChipClassName: "bg-slate-500/12 text-slate-700 ring-1 ring-slate-200",
    coverCardClassName: "border-slate-300 bg-white shadow-[0_24px_70px_-34px_rgba(51,65,85,0.3)]",
    coverHeaderClassName:
      "border-slate-300 bg-[repeating-linear-gradient(135deg,rgba(51,65,85,0.07)_0_11px,transparent_11px_28px),linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,251,235,0.95)_52%,rgba(226,232,240,0.92))]",
    coverPrimaryBadgeClassName: "bg-slate-900 text-white",
    coverSecondaryBadgeClassName: "bg-white text-slate-700 shadow-sm",
    coverMetaPanelClassName: "border-slate-200 bg-slate-100/70 text-slate-700",
    overviewCardClassName: "border-slate-300 bg-white shadow-sm",
    overviewBadgeClassName: "border-orange-200 text-orange-800 bg-orange-50",
    pageCardClassName: "border-slate-300 bg-white shadow-sm",
    pageHeaderClassName:
      "border-slate-300 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,251,235,0.94)_46%,rgba(226,232,240,0.86))]",
    pageTitlePromptClassName:
      "border-slate-300 bg-white focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100",
    pageTitleLabelClassName: "text-slate-500",
    blockSurfaceClassName: "border-slate-200 bg-slate-50/75",
    addActionsClassName: "border-slate-300 bg-slate-100/80",
    richTextSurfaceClassName: "border-slate-200 bg-white",
    richTextToolbarClassName: "border-slate-200",
    richTextEditorClassName: "text-slate-800",
    readOnlyRichTextClassName: "prose-slate text-slate-800",
  },
  {
    id: "painting",
    name: "Painted Canvas",
    trade: "Painting",
    vibe: "Soft, refined, and color-forward",
    description: "Muted pigment washes and clean framing give painting proposals a tasteful studio look without becoming decorative noise.",
    bestFor: "Interior painting, exterior refreshes, staining, coatings, cabinet finishing, and designer-led color scopes.",
    swatches: ["#7c2d12", "#fb7185", "#f5d0fe"],
    canvasClassName:
      "bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(244,114,182,0.12),_transparent_26%),linear-gradient(180deg,#fff8fb_0%,#f8f1f6_100%)]",
    selectorClassName: "border-rose-200 bg-white/90 hover:border-rose-300 hover:bg-white",
    selectorPreviewClassName:
      "border-rose-200 bg-[linear-gradient(120deg,rgba(255,241,242,0.98)_0%,rgba(255,255,255,0.95)_28%,rgba(251,207,232,0.62)_52%,rgba(255,255,255,0.95)_76%,rgba(245,208,254,0.66)_100%)]",
    selectorChipClassName: "bg-rose-500/12 text-rose-800 ring-1 ring-rose-200",
    coverCardClassName: "border-rose-200 bg-white shadow-[0_24px_70px_-34px_rgba(190,24,93,0.22)]",
    coverHeaderClassName:
      "border-rose-200 bg-[linear-gradient(120deg,rgba(255,241,242,0.98)_0%,rgba(255,255,255,0.95)_34%,rgba(251,207,232,0.5)_58%,rgba(255,255,255,0.95)_78%,rgba(245,208,254,0.56)_100%)]",
    coverPrimaryBadgeClassName: "bg-rose-900 text-white",
    coverSecondaryBadgeClassName: "bg-white text-rose-900 shadow-sm",
    coverMetaPanelClassName: "border-rose-100 bg-rose-50/70 text-rose-900",
    overviewCardClassName: "border-rose-200 bg-white shadow-sm",
    overviewBadgeClassName: "border-rose-200 text-rose-800 bg-rose-50",
    pageCardClassName: "border-rose-200 bg-white shadow-sm",
    pageHeaderClassName:
      "border-rose-200 bg-[linear-gradient(120deg,rgba(255,241,242,0.98),rgba(255,255,255,0.95)_54%,rgba(251,207,232,0.38))]",
    pageTitlePromptClassName:
      "border-rose-200 bg-white focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100",
    pageTitleLabelClassName: "text-rose-700/70",
    blockSurfaceClassName: "border-rose-100 bg-rose-50/40",
    addActionsClassName: "border-rose-200 bg-rose-50/70",
    richTextSurfaceClassName: "border-rose-100 bg-white",
    richTextToolbarClassName: "border-rose-100",
    richTextEditorClassName: "text-slate-800",
    readOnlyRichTextClassName: "prose-rose text-slate-800",
  },
  {
    id: "editorial",
    name: "Editorial Noir",
    trade: "Modern",
    vibe: "High-contrast and dramatic",
    description: "Dark-forward presentation with warm brass accents for bold design-led scopes that need a punchier sales feel.",
    bestFor: "Luxury remodels, design presentations, premium builder packages, and modern studio proposals.",
    swatches: ["#111827", "#d97706", "#f3f4f6"],
    canvasClassName:
      "bg-[radial-gradient(circle_at_top_left,_rgba(217,119,6,0.18),_transparent_26%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.16),_transparent_32%),linear-gradient(180deg,#f5f5f4_0%,#e7e5e4_100%)]",
    selectorClassName: "border-stone-300 bg-stone-50/90 hover:border-amber-300 hover:bg-white",
    selectorPreviewClassName:
      "border-stone-700 bg-[linear-gradient(135deg,rgba(17,24,39,0.96),rgba(41,37,36,0.94)_52%,rgba(217,119,6,0.4))]",
    selectorChipClassName: "bg-amber-500/15 text-amber-800 ring-1 ring-amber-200",
    coverCardClassName: "border-stone-300 bg-stone-950 text-white shadow-[0_28px_80px_-36px_rgba(28,25,23,0.72)]",
    coverHeaderClassName:
      "border-stone-700 bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(28,25,23,0.96)_52%,rgba(217,119,6,0.34))]",
    coverPrimaryBadgeClassName: "bg-white text-stone-950",
    coverSecondaryBadgeClassName: "bg-white/10 text-stone-100 ring-1 ring-white/15",
    coverMetaPanelClassName: "border-stone-700 bg-white/5 text-stone-200",
    overviewCardClassName: "border-stone-300 bg-[#fcfbf7] shadow-sm",
    overviewBadgeClassName: "border-amber-200 text-amber-800 bg-amber-50",
    pageCardClassName: "border-stone-300 bg-[#fcfbf7] shadow-sm",
    pageHeaderClassName:
      "border-stone-300 bg-[linear-gradient(135deg,rgba(255,251,235,0.9),rgba(255,255,255,0.92)_42%,rgba(231,229,228,0.95))]",
    pageTitlePromptClassName:
      "border-stone-300 bg-white focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100",
    pageTitleLabelClassName: "text-stone-500",
    blockSurfaceClassName: "border-stone-200 bg-white",
    addActionsClassName: "border-stone-300 bg-stone-100/80",
    richTextSurfaceClassName: "border-stone-200 bg-white",
    richTextToolbarClassName: "border-stone-200",
    richTextEditorClassName: "text-stone-700",
    readOnlyRichTextClassName: "prose-stone text-stone-700",
  },
]

export function isProposalThemeId(value: string | null | undefined): value is ProposalThemeId {
  return PROPOSAL_THEMES.some((theme) => theme.id === value)
}

export function normalizeProposalThemeId(value: string | null | undefined): ProposalThemeId {
  return isProposalThemeId(value) ? value : DEFAULT_PROPOSAL_THEME_ID
}

export function getProposalTheme(value: string | null | undefined): ProposalThemeDefinition {
  return PROPOSAL_THEMES.find((theme) => theme.id === value) ?? PROPOSAL_THEMES[0]
}
