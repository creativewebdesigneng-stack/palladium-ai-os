/**
 * Mission Control catalogue — client-safe constants shared by UI and agents.
 */

export const PERSONAL_CATEGORIES = [
  {
    id: "shopping",
    label: "Shopping",
    icon: "ShoppingBag",
    grad: "from-violet-500 to-fuchsia-600",
    desc: "Compare products, track prices, prepare purchases",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    icon: "Sparkles",
    grad: "from-fuchsia-500 to-rose-500",
    desc: "Routines, habits and personal projects",
  },
  {
    id: "health",
    label: "Health & Wellness",
    icon: "HeartPulse",
    grad: "from-emerald-500 to-teal-600",
    desc: "Wellness organisation — not medical advice",
  },
  {
    id: "food",
    label: "Food & Meals",
    icon: "UtensilsCrossed",
    grad: "from-amber-500 to-orange-600",
    desc: "Meal plans, recipes and grocery lists",
  },
  {
    id: "travel",
    label: "Travel",
    icon: "Plane",
    grad: "from-sky-500 to-cyan-600",
    desc: "Research trips, compare stays and itineraries",
  },
  {
    id: "finance",
    label: "Finance & Budgeting",
    icon: "PiggyBank",
    grad: "from-lime-500 to-emerald-600",
    desc: "Budget organisation — not financial advice",
  },
  {
    id: "home",
    label: "Home",
    icon: "Home",
    grad: "from-indigo-500 to-violet-600",
    desc: "Maintenance, supplies and household admin",
  },
  {
    id: "organisation",
    label: "Personal Organisation",
    icon: "ListChecks",
    grad: "from-zinc-400 to-zinc-600",
    desc: "Lists, errands and follow-ups",
  },
  {
    id: "calendar",
    label: "Calendar & Scheduling",
    icon: "CalendarClock",
    grad: "from-blue-500 to-indigo-600",
    desc: "Plan the day, prepare bookings",
  },
  {
    id: "research",
    label: "Research",
    icon: "Telescope",
    grad: "from-cyan-500 to-blue-600",
    desc: "Deep research and summaries with sources",
  },
  {
    id: "education",
    label: "Education",
    icon: "GraduationCap",
    grad: "from-teal-500 to-cyan-600",
    desc: "Study plans and learning paths",
  },
  {
    id: "entertainment",
    label: "Entertainment",
    icon: "Clapperboard",
    grad: "from-rose-500 to-red-600",
    desc: "Recommendations for what to watch, read, play",
  },
  {
    id: "daily",
    label: "Daily Tasks",
    icon: "Sun",
    grad: "from-orange-500 to-amber-500",
    desc: "Reminders and daily briefings",
  },
  {
    id: "custom",
    label: "Custom",
    icon: "Wand2",
    grad: "from-violet-500 to-indigo-600",
    desc: "Build an agent for anything else",
  },
];

export const CATEGORY_LABEL = Object.fromEntries(PERSONAL_CATEGORIES.map((c) => [c.id, c.label]));

/** Categories that carry an explicit "this is not professional advice" notice. */
export const ADVISORY_NOTICE = {
  health:
    "General wellness organisation only. This is not medical advice and does not replace a qualified healthcare professional.",
  finance: "Budgeting and organisation only. This is not financial or investment advice.",
};

export const AUTONOMY_LEVELS = [
  { id: "assist", level: 1, label: "Assist", desc: "Researches and recommends. Never acts." },
  {
    id: "prepare",
    level: 2,
    label: "Prepare",
    desc: "Researches and prepares an action, then waits for your approval.",
  },
  {
    id: "execute",
    level: 3,
    label: "Execute",
    desc: "Can carry out permitted non-financial actions automatically.",
  },
  {
    id: "approval_required",
    level: 4,
    label: "Approval required",
    desc: "Every sensitive, financial, account or external action needs explicit approval.",
  },
];

export const AUTONOMY_LABEL = Object.fromEntries(
  AUTONOMY_LEVELS.map((a) => [a.id, `L${a.level} · ${a.label}`]),
);

export const PERSONALITIES = ["Professional", "Friendly", "Concise", "Analytical", "Encouraging"];

export const TOOL_CATALOG = [
  {
    id: "web_search",
    label: "Web search",
    desc: "Search the open web for information",
    sensitive: false,
  },
  {
    id: "browser",
    label: "Browser agent",
    desc: "Navigate approved websites and read pages",
    sensitive: false,
  },
  {
    id: "connected_service",
    label: "Connected services",
    desc: "Use only the provider accounts assigned to this agent",
    sensitive: false,
  },
  {
    id: "shopping_search",
    label: "Shopping search",
    desc: "Search supported retailers and compare products",
    sensitive: false,
  },
  {
    id: "price_tracker",
    label: "Price tracking",
    desc: "Monitor price changes over time",
    sensitive: false,
  },
  {
    id: "calendar",
    label: "Calendar",
    desc: "Read and prepare calendar entries",
    sensitive: false,
  },
  {
    id: "reminders",
    label: "Reminders",
    desc: "Create reminders and follow-ups",
    sensitive: false,
  },
  { id: "documents", label: "Documents", desc: "Read and produce documents", sensitive: false },
  {
    id: "email_draft",
    label: "Message drafting",
    desc: "Draft messages for your approval",
    sensitive: true,
  },
  {
    id: "booking",
    label: "Booking preparation",
    desc: "Prepare a booking — never confirms it",
    sensitive: true,
  },
  {
    id: "checkout",
    label: "Checkout preparation",
    desc: "Prepare a purchase for your explicit approval",
    sensitive: true,
  },
];

export const DEFAULT_ALLOWED_DOMAINS = [
  "amazon.co.uk",
  "johnlewis.com",
  "argos.co.uk",
  "currys.co.uk",
  "ikea.com",
  "booking.com",
  "trainline.com",
  "tesco.com",
  "sainsburys.co.uk",
];

export const AGENT_TEMPLATES = [
  {
    name: "Shopping Assistant",
    category: "shopping",
    purpose:
      "Find products matching my requirements, compare options, monitor prices and prepare purchases for my approval.",
    tools: ["web_search", "browser", "shopping_search", "price_tracker", "checkout"],
    autonomy: "prepare",
    budget: 250,
  },
  {
    name: "Meal Planner",
    category: "food",
    purpose: "Build weekly meal plans around my dietary preferences and produce a grocery list.",
    tools: ["web_search", "documents"],
    autonomy: "execute",
  },
  {
    name: "Travel Assistant",
    category: "travel",
    purpose:
      "Research destinations, compare stays and flights, and prepare itineraries and bookings for approval.",
    tools: ["web_search", "browser", "booking"],
    autonomy: "prepare",
    budget: 800,
  },
  {
    name: "Personal Organiser",
    category: "organisation",
    purpose: "Keep my lists, errands and follow-ups in order and tell me what matters today.",
    tools: ["reminders", "calendar", "documents"],
    autonomy: "execute",
  },
  {
    name: "Home Assistant",
    category: "home",
    purpose: "Track household supplies, maintenance schedules and reorder essentials for approval.",
    tools: ["shopping_search", "reminders", "checkout"],
    autonomy: "prepare",
    budget: 120,
  },
  {
    name: "Research Assistant",
    category: "research",
    purpose: "Run deep research on any topic and return a sourced summary.",
    tools: ["web_search", "browser", "documents"],
    autonomy: "assist",
  },
  {
    name: "Calendar Assistant",
    category: "calendar",
    purpose: "Plan my week, protect focus time and prepare meeting invitations.",
    tools: ["calendar", "reminders", "email_draft"],
    autonomy: "prepare",
  },
  {
    name: "Gift Finder",
    category: "shopping",
    purpose: "Find thoughtful gift ideas for the people and dates I care about, within budget.",
    tools: ["web_search", "shopping_search", "checkout"],
    autonomy: "prepare",
    budget: 80,
  },
  {
    name: "Price Tracker",
    category: "shopping",
    purpose: "Watch the items on my list and tell me the moment the price drops.",
    tools: ["shopping_search", "price_tracker"],
    autonomy: "execute",
  },
  {
    name: "Daily Planner",
    category: "daily",
    purpose: "Give me a morning briefing and organise my tasks for the day.",
    tools: ["calendar", "reminders", "documents"],
    autonomy: "execute",
  },
];

export const MEMORY_CATEGORIES = [
  {
    id: "shopping",
    label: "Shopping preferences",
    hints: [
      "Preferred brands",
      "Clothing size",
      "Budget preference",
      "Preferred retailers",
      "Delivery preference",
    ],
  },
  {
    id: "food",
    label: "Food preferences",
    hints: ["Favourite foods", "Dietary preference", "Cooking style", "Allergies to avoid"],
  },
  {
    id: "travel",
    label: "Travel preferences",
    hints: ["Preferred airline", "Hotel preference", "Seat preference", "Travel budget"],
  },
  {
    id: "routines",
    label: "Personal routines",
    hints: ["Morning routine", "Workout days", "Weekly shop day", "Focus hours"],
  },
  {
    id: "dates",
    label: "Important dates",
    hints: ["Birthday", "Anniversary", "Renewal date", "Appointment"],
  },
  {
    id: "general",
    label: "General preferences",
    hints: ["Personal preference", "Communication style", "Household detail"],
  },
];

export const RISK_STYLE = {
  low: { label: "Low risk", badge: "bg-emerald-500/15 text-emerald-300", dot: "bg-emerald-400" },
  medium: { label: "Medium risk", badge: "bg-amber-500/15 text-amber-300", dot: "bg-amber-400" },
  high: { label: "High risk", badge: "bg-rose-500/15 text-rose-300", dot: "bg-rose-400" },
};

export const TASK_STATUS_STYLE = {
  pending: { label: "Pending", badge: "bg-white/10 text-zinc-300", dot: "bg-zinc-400" },
  queued: { label: "Queued", badge: "bg-white/10 text-zinc-300", dot: "bg-zinc-400" },
  running: { label: "Running", badge: "bg-cyan-500/15 text-cyan-300", dot: "bg-cyan-400" },
  awaiting_approval: {
    label: "Awaiting approval",
    badge: "bg-amber-500/15 text-amber-300",
    dot: "bg-amber-400",
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-500/15 text-emerald-300",
    dot: "bg-emerald-400",
  },
  failed: { label: "Failed", badge: "bg-rose-500/15 text-rose-300", dot: "bg-rose-400" },
  cancelled: { label: "Cancelled", badge: "bg-white/10 text-zinc-500", dot: "bg-zinc-600" },
};

export const ACTION_TYPES = {
  purchase: "Shopping purchase",
  external_action: "External action",
  account_change: "Account change",
  message: "Message waiting to be sent",
  booking: "Booking",
  payment: "Payment",
  email_send: "Email draft",
  email_draft: "Email draft",
  calendar_create: "Calendar event",
  slack_post: "Slack message",
  hubspot_contact_update: "HubSpot contact update",
  hubspot_deal_update: "HubSpot deal update",
  asana_task_create: "Asana task creation",
  asana_task_update: "Asana task update",
  linear_issue_create: "Linear issue creation",
  linear_issue_update: "Linear issue update",
  notion_page_create: "Notion page creation",
  other: "Other sensitive action",
};

export const EXAMPLE_REQUESTS = [
  "I need a new office chair under £250.",
  "Find me three good hotels in London for next weekend.",
  "Find the cheapest compatible printer ink.",
  "Build me a weekly meal plan.",
  "Remind me to renew my car insurance.",
  "Find birthday gift ideas for my brother.",
  "Compare these three laptops.",
  "Find a gym near me.",
  "Organise my tasks for tomorrow.",
];

export const formatMoney = (amount, currency = "GBP") =>
  amount === null || amount === undefined || amount === ""
    ? "—"
    : new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(Number(amount));
