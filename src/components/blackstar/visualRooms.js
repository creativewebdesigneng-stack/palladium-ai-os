const ROUTE_ROOMS = [
  [['/mission-control'], 'astra-room-mission'],
  [['/outcomes'], 'astra-room-core'],
  [['/ai-hub', '/ai-workbench', '/ai-model-hub', '/models', '/mcp-hub'], 'astra-room-hub'],
  [['/agents', '/workforce', '/autonomous-os'], 'astra-room-workforce'],
  [['/finance'], 'astra-room-finance'],
  [['/trading-hub', '/quant-studio'], 'astra-room-trading'],
  [['/legal', '/legal-hub'], 'astra-room-legal'],
  [['/compliance-sentinel'], 'astra-room-compliance'],
  [['/cinema-studio', '/media-studio', '/creator-hub', '/creator-marketplace', '/creators', '/trusted-social-video', '/voice-studio'], 'astra-room-cinema'],
  [['/game-foundry', '/three-d-studio'], 'astra-room-game'],
  [['/memory', '/recall-notes'], 'astra-room-memory'],
  [['/knowledge', '/research', '/news-research', '/search'], 'astra-room-knowledge'],
  [['/company-hub', '/organisation', '/team'], 'astra-room-company'],
  [['/industry-hub', '/construction-industrial-hub'], 'astra-room-industry'],
  [['/retail-hub', '/commerce-studio', '/dropshipping-hub'], 'astra-room-commerce'],
  [['/website-studio', '/builder', '/ai-builder', '/html-studio'], 'astra-room-builder'],
  [['/admin'], 'astra-room-admin'],
]

const STYLE_ROOM_FALLBACKS = {
  'blackstar-style-cosmic-core': 'astra-room-core',
  'blackstar-style-orbital-elegance': 'astra-room-knowledge',
  'blackstar-style-mission-control': 'astra-room-mission',
  'blackstar-style-neon-infrastructure': 'astra-room-infrastructure',
  'blackstar-style-elite-corporate': 'astra-room-company',
  'blackstar-style-industry-realism': 'astra-room-industry',
  'blackstar-style-creative-universe': 'astra-room-creative',
  'blackstar-style-ai-nexus': 'astra-room-hub',
  'blackstar-style-trading-command': 'astra-room-trading',
  'blackstar-style-ethereal-luxury': 'astra-room-wellbeing',
}

const VISUAL_STYLE_ROUTES = [
  [
    ['/mission-control', '/tasks', '/workflows', '/automation', '/automations', '/computer-control', '/work-os'],
    'blackstar-style-mission-control',
  ],
  [
    ['/trading-hub', '/quant-studio', '/analytics', '/product-analytics'],
    'blackstar-style-trading-command',
  ],
  [
    ['/cinema-studio', '/game-foundry', '/three-d-studio', '/media-studio', '/voice-studio', '/creator-hub', '/creator-marketplace', '/creators', '/trusted-social-video', '/website-studio', '/html-studio', '/builder', '/marketing', '/seo-studio', '/social-operations', '/templates', '/prompts'],
    'blackstar-style-creative-universe',
  ],
  [
    ['/ai-hub', '/ai-workbench', '/ai-model-hub', '/model-arena', '/models', '/agents', '/agent-builder', '/agent-runtime', '/agent-workspaces', '/workforce', '/mcp-hub', '/ai-tools', '/skills', '/tools-framework', '/ai-builder'],
    'blackstar-style-ai-nexus',
  ],
  [
    ['/industry-hub', '/construction-industrial-hub', '/retail-hub', '/commerce-studio', '/dropshipping-hub', '/shopify-connect', '/business-automation', '/marketplace', '/agent-marketplace', '/ai-marketplace', '/tool-marketplace'],
    'blackstar-style-industry-realism',
  ],
  [
    ['/company-hub', '/finance', '/legal', '/legal-hub', '/compliance-sentinel', '/organisation', '/team', '/billing', '/admin', '/security', '/crm', '/crm-studio', '/phone-communications', '/whatsapp-crm', '/smart-tables'],
    'blackstar-style-elite-corporate',
  ],
  [
    ['/projects', '/deployments', '/developer', '/developer-portal', '/developer-workspace', '/version-control', '/terminal', '/code-explorer', '/web-intelligence', '/web', '/browser-preview', '/integrations', '/sync-center', '/business-intelligence'],
    'blackstar-style-neon-infrastructure',
  ],
  [
    ['/knowledge', '/memory', '/recall-notes', '/research', '/news-research', '/search', '/discovery', '/documents', '/files', '/files-analysis', '/docs'],
    'blackstar-style-orbital-elegance',
  ],
  [
    ['/human-frontier', '/health-fitness', '/fitness-studio', '/support', '/notifications', '/settings'],
    'blackstar-style-ethereal-luxury',
  ],
  [
    ['/dashboard', '/autonomous-os', '/shared-intelligence', '/decision-studio', '/chat', '/fast-track', '/outcomes'],
    'blackstar-style-cosmic-core',
  ],
]

export const VISUAL_STYLE_LABELS = {
  'blackstar-style-cosmic-core': 'Cosmic Core',
  'blackstar-style-orbital-elegance': 'Orbital Elegance',
  'blackstar-style-mission-control': 'Mission Control',
  'blackstar-style-neon-infrastructure': 'Neon Infrastructure',
  'blackstar-style-elite-corporate': 'Elite Corporate',
  'blackstar-style-industry-realism': 'Industry Realism',
  'blackstar-style-creative-universe': 'Creative Universe',
  'blackstar-style-ai-nexus': 'AI Nexus',
  'blackstar-style-trading-command': 'Trading Command',
  'blackstar-style-ethereal-luxury': 'Ethereal Luxury',
}

export const ROOM_LABELS = {
  'astra-room-mission': 'Blackstar mission theatre',
  'astra-room-hub': 'Blackstar intelligence hub',
  'astra-room-workforce': 'Blackstar workforce floor',
  'astra-room-finance': 'Blackstar finance floor',
  'astra-room-trading': 'Blackstar market observatory',
  'astra-room-legal': 'Blackstar legal chamber',
  'astra-room-compliance': 'Blackstar compliance sentinel',
  'astra-room-cinema': 'Blackstar cinema stage',
  'astra-room-game': 'Blackstar game foundry',
  'astra-room-memory': 'Blackstar memory vault',
  'astra-room-knowledge': 'Blackstar knowledge lattice',
  'astra-room-company': 'Blackstar company command',
  'astra-room-industry': 'Blackstar industrial systems',
  'astra-room-commerce': 'Blackstar commerce network',
  'astra-room-builder': 'Blackstar creation studio',
  'astra-room-admin': 'Blackstar admin control',
  'astra-room-core': 'Blackstar command core',
  'astra-room-infrastructure': 'Blackstar infrastructure grid',
  'astra-room-creative': 'Blackstar creative universe',
  'astra-room-wellbeing': 'Blackstar human frontier',
}

export function blackstarRoomForPath(pathname = '') {
  for (const [prefixes, room] of ROUTE_ROOMS) {
    if (prefixes.some((prefix) => pathname.startsWith(prefix))) return room
  }
  if (!blackstarHasExplicitVisualStyleForPath(pathname)) return 'astra-room-default'
  return STYLE_ROOM_FALLBACKS[blackstarVisualStyleForPath(pathname)] || 'astra-room-default'
}

export function blackstarHasExplicitVisualStyleForPath(pathname = '') {
  return VISUAL_STYLE_ROUTES.some(([prefixes]) => prefixes.some((prefix) => pathname.startsWith(prefix)))
}

export function blackstarVisualStyleForPath(pathname = '') {
  for (const [prefixes, style] of VISUAL_STYLE_ROUTES) {
    if (prefixes.some((prefix) => pathname.startsWith(prefix))) return style
  }
  return 'blackstar-style-cosmic-core'
}
