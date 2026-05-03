export type FeatureIcon =
  | "calculator"
  | "phone"
  | "calendar"
  | "briefcase"
  | "message"
  | "signature"
  | "users"
  | "clock"
  | "sms"
  | "mic"
  | "summary"
  | "quickbooks"

export type Feature = {
  slug: string
  title: string
  shortTitle: string
  description: string
  hero: string
  body: string
  outcomes: string[]
  icon: FeatureIcon
}

export type FeatureGroup = {
  name: string
  label: string
  description: string
  features: Feature[]
}

export const featureGroups: FeatureGroup[] = [
  {
    name: "Revenue Command",
    label: "Pricing, margins, and money movement",
    description: "Keep estimates, job costs, invoices, and accounting aligned from the first scope note to the final bill.",
    features: [
      {
        slug: "smart-job-costing",
        title: "Smart Job Costing",
        shortTitle: "Smart job costing",
        description: "Track labor, materials, client price, and margin in one live project view.",
        hero: "Know whether a job is profitable before the invoice goes out.",
        body: "ContractorOps AI keeps cost, price, margin, and project scope connected so your team can make faster decisions without rebuilding spreadsheets.",
        outcomes: ["Compare GC cost against client price", "Spot margin pressure early", "Keep estimates, quotes, and invoices tied together"],
        icon: "calculator",
      },
      {
        slug: "project-finance-management",
        title: "Project & Finance Management",
        shortTitle: "Project finances",
        description: "Connect scopes, documents, tasks, costs, and invoices around the job.",
        hero: "A cleaner command center for the business side of every project.",
        body: "Manage project execution and financial control together, so teams can see what was promised, what changed, what it costs, and what is ready to bill.",
        outcomes: ["Track scopes, tasks, and cost status", "Keep change context attached to the project", "Move from approved work to invoice with less re-entry"],
        icon: "briefcase",
      },
      {
        slug: "quickbooks-integration",
        title: "QuickBooks Integration",
        shortTitle: "QuickBooks",
        description: "Prepare completed work for accounting handoff without duplicate entry.",
        hero: "Turn clean project data into cleaner accounting handoff.",
        body: "QuickBooks-ready workflows help translate approved scope, client pricing, and invoice details into the accounting system your business already uses.",
        outcomes: ["Reduce duplicate invoice entry", "Keep job totals aligned with accounting", "Make billing handoff easier for the office"],
        icon: "quickbooks",
      },
    ],
  },
  {
    name: "Conversation Intelligence",
    label: "Calls, texts, records, and summaries",
    description: "Capture every customer conversation and turn it into organized next steps your team can trust.",
    features: [
      {
        slug: "phone-ai-scheduling",
        title: "Phone AI with AI-Powered Scheduling",
        shortTitle: "Phone AI scheduling",
        description: "Answer calls, qualify requests, and guide customers toward available times.",
        hero: "A front-office voice agent that can keep the calendar moving.",
        body: "Phone AI helps collect details from callers, identify scheduling intent, and route customers toward booking times based on your availability.",
        outcomes: ["Answer missed-call moments faster", "Collect job context before the visit", "Reduce back-and-forth scheduling texts"],
        icon: "phone",
      },
      {
        slug: "sms-ai",
        title: "SMS AI",
        shortTitle: "SMS AI",
        description: "Reply to leads and customers through the channel they already use.",
        hero: "Fast, useful text replies without making customers download an app.",
        body: "SMS AI helps draft and send practical replies, gather project details, share links, and keep the lead moving while the conversation stays organized.",
        outcomes: ["Respond while the lead is warm", "Collect photos, notes, and access details", "Keep customer context attached to the job"],
        icon: "sms",
      },
      {
        slug: "client-communication",
        title: "Client Communication",
        shortTitle: "Client communication",
        description: "Keep messages, photos, notes, and customer expectations in one place.",
        hero: "One client thread for the whole job lifecycle.",
        body: "Bring customer calls, texts, booking context, and project notes into a shared workspace so the next person on your team knows exactly what happened.",
        outcomes: ["See customer context before responding", "Keep project updates easier to find", "Reduce dropped handoffs between office and field"],
        icon: "message",
      },
      {
        slug: "on-site-call-recording",
        title: "On-Site Call Recording",
        shortTitle: "On-site recording",
        description: "Capture important site-visit conversations while the details are fresh.",
        hero: "Preserve field conversations before they become fuzzy memory.",
        body: "On-site recording helps keep customer walkthroughs, scope discussions, and field notes available for estimating, follow-up, and internal handoffs.",
        outcomes: ["Record field conversations tied to the job", "Keep site context available to the office", "Reduce missed details after walkthroughs"],
        icon: "mic",
      },
      {
        slug: "phone-call-recording",
        title: "Phone Call Recording",
        shortTitle: "Phone recording",
        description: "Keep customer phone conversations attached to the right lead or project.",
        hero: "Make phone calls part of the customer record.",
        body: "Phone call recording helps preserve important customer context, job details, commitments, and follow-up needs that often get lost after a busy day.",
        outcomes: ["Capture customer call details", "Review commitments before quoting", "Support cleaner office-to-field handoffs"],
        icon: "phone",
      },
      {
        slug: "transcription",
        title: "Transcription",
        shortTitle: "Transcription",
        description: "Turn recorded conversations into searchable project text.",
        hero: "Convert spoken context into usable job records.",
        body: "Transcription turns phone and field recordings into text your team can search, summarize, reference, and use while building estimates or coordinating work.",
        outcomes: ["Search conversations by detail", "Use transcripts for estimates and follow-up", "Keep less information trapped in audio"],
        icon: "summary",
      },
      {
        slug: "communication-summaries",
        title: "Customer Communication Summaries",
        shortTitle: "Communication summaries",
        description: "Condense long conversations into clear notes, decisions, and next actions.",
        hero: "Summaries that make every handoff easier.",
        body: "ContractorOps AI can summarize customer communication into practical context: what they need, what was promised, open questions, and the next step.",
        outcomes: ["Summarize calls, texts, and notes", "Highlight decisions and open items", "Help new team members catch up quickly"],
        icon: "summary",
      },
    ],
  },
  {
    name: "Field Orchestration",
    label: "Scheduling, crews, and availability",
    description: "Coordinate calendars, availability, crews, and subcontractors without losing track of who is doing what.",
    features: [
      {
        slug: "calendar",
        title: "Calendar",
        shortTitle: "Calendar",
        description: "See appointments, site visits, and project timing in one operating calendar.",
        hero: "A practical calendar built around jobs, not just events.",
        body: "The calendar helps your team understand booked work, upcoming visits, and schedule context connected to clients and projects.",
        outcomes: ["View job and visit timing together", "Reduce scheduling misses", "Keep customer booking context close"],
        icon: "calendar",
      },
      {
        slug: "availability-management",
        title: "Availability Management",
        shortTitle: "Availability",
        description: "Control when customers can book and how scheduling options are offered.",
        hero: "Availability rules that protect your team’s real capacity.",
        body: "Availability management helps define booking windows, avoid overloaded days, and give AI scheduling the guardrails it needs.",
        outcomes: ["Offer better booking windows", "Avoid accidental overbooking", "Keep scheduling aligned with team capacity"],
        icon: "clock",
      },
      {
        slug: "subcontractor-management",
        title: "Subcontractor Management",
        shortTitle: "Subcontractors",
        description: "Organize subs by trade, priority, distance, and dispatch readiness.",
        hero: "Know who to call before the job becomes urgent.",
        body: "Track subcontractor details, trade fit, and dispatch context so the right partner can be contacted when a job needs coverage.",
        outcomes: ["Organize subs by specialty", "Support faster dispatch decisions", "Keep contact and priority data current"],
        icon: "users",
      },
    ],
  },
  {
    name: "Agreement Flow",
    label: "Paperwork, approval, and trust",
    description: "Move from accepted scope to signed agreement with less friction and better records.",
    features: [
      {
        slug: "contracts-signature",
        title: "Contracts & Signature",
        shortTitle: "Contracts & signature",
        description: "Turn approved work into agreements customers can review and sign.",
        hero: "A smoother path from verbal yes to signed work.",
        body: "Contracts and signature workflows help formalize scope, protect expectations, and keep signed records attached to the customer and job.",
        outcomes: ["Send clear agreements for approval", "Capture signatures digitally", "Keep contract records tied to the project"],
        icon: "signature",
      },
    ],
  },
]

export const features = featureGroups.flatMap((group) =>
  group.features.map((feature) => ({ ...feature, groupName: group.name, groupLabel: group.label })),
)

export function getFeature(slug: string) {
  return features.find((feature) => feature.slug === slug)
}
