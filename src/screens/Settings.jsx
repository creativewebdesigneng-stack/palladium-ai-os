import { useState, useMemo } from 'react';
import { User, Globe, Palette, Sparkles, Bell, Lock, ShieldCheck, Link2, KeyRound, Code2, Search } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { SaveBar } from '@/components/settings/shared';
import ProfileSection, { initialProfile } from '@/components/settings/ProfileSection';
import AccountSection, { initialAccount } from '@/components/settings/AccountSection';
import AppearanceSection, { initialAppearance } from '@/components/settings/AppearanceSection';
import AIPreferencesSection, { initialAIPreferences } from '@/components/settings/AIPreferencesSection';
import NotificationsSection, { initialNotifications } from '@/components/settings/NotificationsSection';
import PrivacySection, { initialPrivacy } from '@/components/settings/PrivacySection';
import SecuritySection, { initialSecurity } from '@/components/settings/SecuritySection';
import ConnectedAccountsSection from '@/components/settings/ConnectedAccountsSection';
import APIKeysSection from '@/components/settings/APIKeysSection';
import DeveloperSection, { initialDeveloper } from '@/components/settings/DeveloperSection';
import { SECTIONS } from '@/components/settings/settingsData';

const ICONS = { User, Globe, Palette, Sparkles, Bell, Lock, ShieldCheck, Link2, KeyRound, Code2 };

const INITIAL = {
  profile: initialProfile,
  account: initialAccount,
  appearance: initialAppearance,
  ai: initialAIPreferences,
  notifications: initialNotifications,
  privacy: initialPrivacy,
  security: initialSecurity,
  developer: initialDeveloper,
};

export default function Settings() {
  const [active, setActive] = useState('profile');
  const [draft, setDraft] = useState(INITIAL);
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(true);

  const update = (section, key, val) => {
    setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: val } }));
    setSaved(false);
  };

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => s.label.toLowerCase().includes(q));
  }, [query]);

  const renderSection = () => {
    switch (active) {
      case 'profile': return <ProfileSection data={draft.profile} update={(k, v) => update('profile', k, v)} />;
      case 'account': return <AccountSection data={draft.account} update={(k, v) => update('account', k, v)} />;
      case 'appearance': return <AppearanceSection data={draft.appearance} update={(k, v) => update('appearance', k, v)} />;
      case 'ai': return <AIPreferencesSection data={draft.ai} update={(k, v) => update('ai', k, v)} />;
      case 'notifications': return <NotificationsSection data={draft.notifications} update={(k, v) => update('notifications', k, v)} />;
      case 'privacy': return <PrivacySection data={draft.privacy} update={(k, v) => update('privacy', k, v)} />;
      case 'security': return <SecuritySection data={draft.security} update={(k, v) => update('security', k, v)} />;
      case 'connected': return <ConnectedAccountsSection />;
      case 'apikeys': return <APIKeysSection />;
      case 'developer': return <DeveloperSection data={draft.developer} update={(k, v) => update('developer', k, v)} />;
      default: return null;
    }
  };

  const handleSave = () => { setSaved(true); };

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Settings" description="Manage your profile, preferences and account." />

      <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
        {/* Left navigation */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search settings…"
                className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
            </div>
            <nav className="space-y-0.5">
              {filteredSections.map((s) => {
                const Icon = ICONS[s.icon];
                const isActive = active === s.id;
                return (
                  <button key={s.id} onClick={() => setActive(s.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${isActive ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}{s.label}
                  </button>
                );
              })}
              {filteredSections.length === 0 && <p className="px-3 py-4 text-center text-[11px] text-zinc-600">No matches.</p>}
            </nav>
          </div>
        </div>

        {/* Active section + save bar */}
        <div className="min-w-0 space-y-4">
          {renderSection()}
          <SaveBar onSave={handleSave} dirty={!saved} />
        </div>
      </div>
    </>
  );
}