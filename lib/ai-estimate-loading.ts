/** Rotating copy shown while POST /generate-estimate runs (can take 1–3+ minutes). */

export const AI_ESTIMATE_LOADING_MESSAGES = [
  "Reading your project description…",
  "Counting boards twice (contractor math)…",
  "Arguing with the AI about whether that’s one trip or two…",
  "Looking up materials that definitely exist somewhere…",
  "Estimating labor — coffee not included…",
  "Checking if “small quick job” is legally a phrase…",
  "Adding line items like shingles, not excuses…",
  "Rounding quantities so the truck doesn’t look empty…",
  "Negotiating with supply houses in our imagination…",
  "Applying your labor rate with extreme prejudice…",
  "Still faster than handwriting 60 rows…",
  "Teaching the AI what a square foot is again…",
  "Buffering… but with purpose…",
  "Almost there — big jobs need a minute…",
  "Polishing line items until they sparkle…",
  "Making sure tax toggles don’t unionize…",
  "Consulting the ghost of estimates past…",
  "One more pass — thorough beats fast (usually)…",
  "If this were easy you’d be on a roof right now…",
  "Finalizing — do not refresh unless you enjoy suspense…",
] as const

export const AI_ESTIMATE_LOADING_HINT =
  "Large estimates can take up to 4 minutes. Hang tight — closing this tab won’t speed it up."

export const AI_ESTIMATE_LOADING_INTERVAL_MS = 3500

/** Client timeout for POST /generate-estimate (240s). */
export const AI_ESTIMATE_REQUEST_TIMEOUT_MS = 240_000
