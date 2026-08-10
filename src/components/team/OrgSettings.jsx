import { motion } from 'framer-motion';
import { Building2, Image, Globe, Users, Clock, MapPin, Cpu, KeyRound, ShieldCheck, Save } from 'lucide-react';
import { ORG_SETTINGS } from './teamData';
import { SectionHead } from './shared';

const FIELDS = [
  { label: 'Organisation Name', value: ORG_SETTINGS.name, icon: Building2 },
  { label: 'Industry', value: ORG_SETTINGS.industry, icon: Globe },
  { label: 'Company Size', value: ORG_SETTINGS.size, icon: Users },
  { label: 'Timezone', value: ORG_SETTINGS.timezone, icon: Clock },
  { label: 'Country', value: ORG_SETTINGS.country, icon: MapPin },
  { label: 'Default AI Model', value: ORG_SETTINGS.defaultModel, icon: Cpu },
  { label: 'Default Permissions', value: ORG_SETTINGS.defaultPermissions, icon: KeyRound },
  { label: 'Security Settings', value: ORG_SETTINGS.security, icon: ShieldCheck },
];

export default function OrgSettings() {
  return (
    <div>
      <SectionHead icon={Building2} title="Organisation Settings" grad="from-fuchsia-500 to-purple-500" action={
        <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white"><Save className="h-3.5 w-3.5" />Save</button>
      } />
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        {/* Logo card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-center">
          <span className={`mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br ${ORG_SETTINGS.logoGrad} shadow-xl`}><Building2 className="h-9 w-9 text-white" /></span>
          <p className="mt-3 text-sm font-semibold text-white">{ORG_SETTINGS.name}</p>
          <p className="text-[10px] text-zinc-500">{ORG_SETTINGS.industry}</p>
          <button className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5"><Image className="h-3.5 w-3.5" />Change logo</button>
        </motion.div>

        {/* Form fields */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(f => (
              <div key={f.label} className="rounded-xl border border-white/5 bg-white/[.02] p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  <f.icon className="h-3 w-3" />{f.label}
                </div>
                <p className="text-xs text-zinc-200">{f.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] text-amber-300">
            Changes to organisation settings are logged in the audit trail and may require owner approval.
          </div>
        </motion.div>
      </div>
    </div>
  );
}