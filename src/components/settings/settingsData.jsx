// Settings page navigation. Section bodies read live data or show an honest
// "not configured yet" state — see the individual section components.

export const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: 'User' },
  { id: 'account', label: 'Account', icon: 'Globe' },
  { id: 'appearance', label: 'Appearance', icon: 'Palette' },
  { id: 'ai', label: 'AI Preferences', icon: 'Sparkles' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell' },
  { id: 'privacy', label: 'Privacy', icon: 'Lock' },
  { id: 'security', label: 'Security', icon: 'ShieldCheck' },
  { id: 'connected', label: 'Connected Accounts', icon: 'Link2' },
  { id: 'apikeys', label: 'API Keys', icon: 'KeyRound' },
  { id: 'developer', label: 'Developer Settings', icon: 'Code2' },
];
