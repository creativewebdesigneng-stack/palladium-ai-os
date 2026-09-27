const ROUTE_ROOMS = [
  [['/mission-control'], 'astra-room-mission'],
  [['/ai-hub', '/ai-workbench', '/ai-model-hub', '/models', '/mcp-hub'], 'astra-room-hub'],
  [['/agents', '/workforce', '/autonomous-os'], 'astra-room-workforce'],
  [['/finance'], 'astra-room-finance'],
  [['/trading-hub', '/quant-studio'], 'astra-room-trading'],
  [['/legal', '/legal-hub'], 'astra-room-legal'],
  [['/compliance-sentinel'], 'astra-room-compliance'],
  [['/cinema-studio', '/media-studio'], 'astra-room-cinema'],
  [['/game-foundry', '/three-d-studio'], 'astra-room-game'],
  [['/memory', '/recall-notes'], 'astra-room-memory'],
  [['/knowledge', '/research', '/news-research'], 'astra-room-knowledge'],
  [['/company-hub', '/organisation', '/team'], 'astra-room-company'],
  [['/industry-hub', '/construction-industrial-hub'], 'astra-room-industry'],
  [['/retail-hub', '/commerce-studio', '/dropshipping-hub'], 'astra-room-commerce'],
  [['/website-studio', '/builder', '/ai-builder', '/html-studio'], 'astra-room-builder'],
  [['/admin'], 'astra-room-admin'],
]

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
}

export function blackstarRoomForPath(pathname = '') {
  for (const [prefixes, room] of ROUTE_ROOMS) {
    if (prefixes.some((prefix) => pathname.startsWith(prefix))) return room
  }
  return 'astra-room-default'
}
