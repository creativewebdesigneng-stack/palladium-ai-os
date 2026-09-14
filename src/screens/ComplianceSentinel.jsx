import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BellRing, BookOpenCheck, CheckCircle2, ClipboardCheck,
  ExternalLink, FileClock, FileSearch, Gauge, Globe2, Layers3, Plus, Radar,
  RefreshCcw, Scale, ShieldAlert, ShieldCheck, Siren, SlidersHorizontal, Waypoints,
} from 'lucide-react';
import {
  deleteComplianceOwnedRecord,
  getComplianceSentinelDashboard,
  listComplianceAlerts,
  listComplianceControls,
  listComplianceFindings,
  listComplianceObligations,
  listComplianceProfiles,
  listComplianceRegulatoryChanges,
  listComplianceRegulations,
  listComplianceSources,
  saveComplianceAlert,
  saveComplianceControl,
  saveComplianceFinding,
  saveComplianceObligation,
  saveComplianceProfile,
} from '@/lib/compliance/compliance-sentinel.functions';

const TABS = [
  ['command', 'Command Center', Radar],
  ['intelligence', 'Regulatory Intelligence', FileSearch],
  ['changes', 'Change Radar', Activity],
  ['obligations', 'Obligations', ClipboardCheck],
  ['controls', 'Controls', ShieldCheck],
  ['findings', 'Findings', ShieldAlert],
  ['sources', 'Sources & Coverage', Globe2],
  ['alerts', 'Alerts', BellRing],
];

const inputClass = 'rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-400/35';
const panelClass = 'blackstar-panel rounded-[24px] border border-white/[.08] bg-black/25 p-5';

function Pill({ children, tone = 'zinc' }) {
  const tones = {
    zinc: 'border-white/[.08] bg-white/[.035] text-zinc-400',
    green: 'border-emerald-300/15 bg-emerald-300/[.06] text-emerald-200',
    amber: 'border-amber-300/15 bg-amber-300/[.06] text-amber-200',
    red: 'border-rose-300/15 bg-rose-300/[.06] text-rose-200',
    violet: 'border-violet-300/15 bg-violet-300/[.06] text-violet-200',
    cyan: 'border-cyan-300/15 bg-cyan-300/[.06] text-cyan-200',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${tones[tone] ?? tones.zinc}`}>{children}</span>;
}

function Metric({ label, value, sub, Icon, tone = 'violet' }) {
  const iconTone = { violet: 'text-violet-300', cyan: 'text-cyan-300', green: 'text-emerald-300', amber: 'text-amber-300', red: 'text-rose-300' };
  return <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">{label}</p><Icon className={`h-4 w-4 ${iconTone[tone]}`} /></div><p className="mt-3 text-2xl font-semibold text-white">{value ?? '—'}</p>{sub && <p className="mt-1 text-[11px] text-zinc-600">{sub}</p>}</div>;
}

function Empty({ children }) {
  return <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-600">{children}</div>;
}

function officialLink(url) {
  if (!url) return null;
  return <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-cyan-300/80 hover:text-cyan-200">Official source <ExternalLink className="h-3 w-3" /></a>;
}

export default function ComplianceSentinel() {
  const [tab, setTab] = useState('command');
  const [state, setState] = useState({ dashboard: null, sources: [], regulations: [], changes: [], profiles: [], obligations: [], controls: [], findings: [], alerts: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', organisation_context: '', jurisdictions: 'United Kingdom', sectors: '', products_services: '', risk_appetite: 'standard', framework_preferences: '' });
  const [obligationForm, setObligationForm] = useState({ title: '', requirement: '', jurisdiction: 'United Kingdom', category: 'general', owner_name: '', status: 'review', risk_level: 'medium', effective_on: '', due_on: '', next_review_on: '', source_url: '', notes: '' });
  const [controlForm, setControlForm] = useState({ control_code: '', title: '', description: '', framework: '', control_type: 'preventive', frequency: '', owner_name: '', implementation_status: 'designed', testing_status: 'untested', next_test_on: '' });
  const [findingForm, setFindingForm] = useState({ title: '', description: '', severity: 'medium', status: 'open', owner_name: '', remediation_plan: '', due_on: '' });
  const [alertForm, setAlertForm] = useState({ name: '', jurisdictions: 'United Kingdom', regulators: '', domains: '', minimum_severity: 'medium' });

  const parseList = (value) => String(value || '').split(',').map(x => x.trim()).filter(Boolean);

  async function load() {
    setBusy(true);
    try {
      const [dashboard, sources, regulations, changes, profiles, obligations, controls, findings, alerts] = await Promise.all([
        getComplianceSentinelDashboard({ data: {} }),
        listComplianceSources({ data: {} }),
        listComplianceRegulations({ data: { limit: 200 } }),
        listComplianceRegulatoryChanges({ data: { limit: 100 } }),
        listComplianceProfiles({ data: {} }),
        listComplianceObligations({ data: {} }),
        listComplianceControls({ data: {} }),
        listComplianceFindings({ data: {} }),
        listComplianceAlerts({ data: {} }),
      ]);
      setState({ dashboard, sources, regulations, changes, profiles, obligations, controls, findings, alerts });
      setLastLoadedAt(new Date());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compliance Sentinel could not load.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  const sourceFreshness = useMemo(() => {
    const now = Date.now();
    return state.sources.reduce((acc, source) => {
      if (source.last_error) acc.errors += 1;
      if (!source.last_success_at) acc.pending += 1;
      else if (now - new Date(source.last_success_at).getTime() > Math.max(24, source.check_interval_hours || 24) * 2 * 3600000) acc.stale += 1;
      else acc.fresh += 1;
      return acc;
    }, { fresh: 0, stale: 0, pending: 0, errors: 0 });
  }, [state.sources]);

  async function submitProfile(e) {
    e.preventDefault(); setBusy(true);
    try {
      await saveComplianceProfile({ data: { ...profileForm, jurisdictions: parseList(profileForm.jurisdictions), sectors: parseList(profileForm.sectors), products_services: parseList(profileForm.products_services), framework_preferences: parseList(profileForm.framework_preferences) } });
      setProfileForm({ ...profileForm, name: '', organisation_context: '' }); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save profile.'); } finally { setBusy(false); }
  }
  async function submitObligation(e) {
    e.preventDefault(); setBusy(true);
    try { await saveComplianceObligation({ data: obligationForm }); setObligationForm({ ...obligationForm, title: '', requirement: '', owner_name: '', source_url: '', notes: '', due_on: '' }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save obligation.'); } finally { setBusy(false); }
  }
  async function submitControl(e) {
    e.preventDefault(); setBusy(true);
    try { await saveComplianceControl({ data: controlForm }); setControlForm({ ...controlForm, control_code: '', title: '', description: '', owner_name: '' }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save control.'); } finally { setBusy(false); }
  }
  async function submitFinding(e) {
    e.preventDefault(); setBusy(true);
    try { await saveComplianceFinding({ data: findingForm }); setFindingForm({ ...findingForm, title: '', description: '', remediation_plan: '', owner_name: '', due_on: '' }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save finding.'); } finally { setBusy(false); }
  }
  async function submitAlert(e) {
    e.preventDefault(); setBusy(true);
    try { await saveComplianceAlert({ data: { ...alertForm, jurisdictions: parseList(alertForm.jurisdictions), regulators: parseList(alertForm.regulators), domains: parseList(alertForm.domains), channels: ['in_app'] } }); setAlertForm({ ...alertForm, name: '' }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save alert.'); } finally { setBusy(false); }
  }
  async function remove(table, id) {
    setBusy(true);
    try { await deleteComplianceOwnedRecord({ data: { table, id } }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not remove record.'); } finally { setBusy(false); }
  }

  const dashboard = state.dashboard || {};
  const statusTone = (value) => ['critical', 'ineffective', 'failed'].includes(value) ? 'red' : ['high', 'review', 'partial', 'partially_effective'].includes(value) ? 'amber' : ['implemented', 'operating', 'effective', 'resolved', 'success'].includes(value) ? 'green' : 'zinc';

  return <div className="space-y-6 pb-12">
    <section className="blackstar-panel relative overflow-hidden rounded-[30px] border border-white/[.08] bg-black/40 p-6 lg:p-8">
      <div aria-hidden className="absolute -right-28 -top-32 h-80 w-80 rounded-full bg-violet-500/12 blur-3xl" />
      <div aria-hidden className="absolute -bottom-36 left-1/3 h-64 w-64 rounded-full bg-cyan-500/[.06] blur-3xl" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.2em] text-violet-300"><ShieldCheck className="h-4 w-4" /> Regulations & Compliance Sentinel <Pill tone="green">Evidence-first</Pill></div><h1 className="mt-3 max-w-5xl text-3xl font-semibold tracking-tight text-white lg:text-5xl">Know what changed, what applies, what is controlled and what still needs evidence.</h1><p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">Sentinel joins authoritative regulatory intelligence with applicability review, obligations, controls, evidence, assessments, remediation and audit history. Source changes are evidence signals — Blackstar does not silently turn them into legal conclusions.</p></div>
        <button onClick={load} disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.06] px-4 py-2.5 text-xs font-medium text-violet-100 disabled:opacity-50"><RefreshCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh Sentinel</button>
      </div>
      <div className="relative mt-6 flex flex-wrap gap-2">{['Authoritative sources', 'Historical versions', 'Change detection', 'Applicability', 'Obligations', 'Controls', 'Evidence', 'Assessments', 'Remediation', 'Alerts', 'Audit trail'].map(x => <Pill key={x}>{x}</Pill>)}</div>
    </section>

    {error && <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[.05] px-4 py-3 text-xs text-rose-200"><span className="font-medium">Sentinel notice:</span> {error}</div>}

    <div className="flex gap-2 overflow-x-auto pb-1">{TABS.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${tab === id ? 'border-violet-300/20 bg-violet-300/[.08] text-violet-100' : 'border-white/[.06] bg-white/[.02] text-zinc-500 hover:text-zinc-300'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>

    {tab === 'command' && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Jurisdictions" value={dashboard.jurisdictions} sub={`${dashboard.sources ?? 0} official sources`} Icon={Globe2} tone="cyan" />
        <Metric label="Active obligations" value={dashboard.activeObligations} sub={`${dashboard.criticalObligations ?? 0} critical gaps`} Icon={ClipboardCheck} tone="violet" />
        <Metric label="High-impact changes" value={dashboard.highImpactChanges} sub="latest 100 changes" Icon={Siren} tone="amber" />
        <Metric label="Control coverage" value={`${dashboard.controlCoverage ?? 0}%`} sub="implemented / operating" Icon={ShieldCheck} tone="green" />
        <Metric label="Open findings" value={dashboard.openFindings} sub={`${dashboard.criticalFindings ?? 0} critical`} Icon={ShieldAlert} tone="red" />
        <Metric label="Automated sources" value={`${dashboard.automatedSources ?? 0}/${dashboard.sources ?? 0}`} sub="verified adapters only" Icon={Waypoints} tone="cyan" />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className={`${panelClass} lg:col-span-2`}><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-amber-300" /><h2 className="font-medium text-white">Regulatory change radar</h2></div><p className="mt-1 text-xs text-zinc-600">Latest source-backed changes. Applicability remains a separate review decision.</p><div className="mt-4 space-y-2">{state.changes.length === 0 ? <Empty>No ingested regulatory changes yet. The catalogue is ready for the sync worker.</Empty> : state.changes.slice(0, 8).map(change => <div key={change.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex flex-wrap items-center gap-2"><Pill tone={statusTone(change.severity)}>{change.severity}</Pill><Pill>{change.change_type}</Pill><span className="text-xs font-medium text-white">{change.regulation?.title || 'Regulatory change'}</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">{change.summary || 'Change captured; review the authoritative source and version history.'}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-zinc-700">{new Date(change.detected_at).toLocaleString()}</span>{officialLink(change.regulation?.canonical_url)}</div></div>)}</div></div>
        <div className={panelClass}><div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-cyan-300" /><h2 className="font-medium text-white">Source health</h2></div><div className="mt-4 grid grid-cols-2 gap-2">{[['Fresh', sourceFreshness.fresh, 'green'], ['Pending adapter', sourceFreshness.pending, 'amber'], ['Stale', sourceFreshness.stale, 'amber'], ['Errors', sourceFreshness.errors, 'red']].map(([label, value, tone]) => <div key={label} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] text-zinc-600">{label}</p><p className={`mt-1 text-lg font-semibold ${tone === 'green' ? 'text-emerald-200' : tone === 'red' ? 'text-rose-200' : 'text-amber-200'}`}>{value}</p></div>)}</div><p className="mt-4 text-[11px] leading-5 text-zinc-600">“Pending adapter” is intentional: Sentinel never labels a source continuously monitored until its adapter has been deployed and verified.</p>{lastLoadedAt && <p className="mt-3 text-[10px] text-zinc-700">Dashboard refreshed {lastLoadedAt.toLocaleTimeString()}</p>}</div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className={panelClass}><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-violet-300" /><h2 className="font-medium text-white">Compliance profiles</h2></div><p className="mt-1 text-xs text-zinc-600">Model the jurisdictions, sectors, products and frameworks that shape a compliance perimeter.</p><form onSubmit={submitProfile} className="mt-4 grid gap-2 md:grid-cols-2"><input required className={inputClass} placeholder="Profile name" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} /><input className={inputClass} placeholder="Jurisdictions, comma separated" value={profileForm.jurisdictions} onChange={e => setProfileForm({ ...profileForm, jurisdictions: e.target.value })} /><input className={inputClass} placeholder="Sectors" value={profileForm.sectors} onChange={e => setProfileForm({ ...profileForm, sectors: e.target.value })} /><input className={inputClass} placeholder="Products / services" value={profileForm.products_services} onChange={e => setProfileForm({ ...profileForm, products_services: e.target.value })} /><input className={inputClass} placeholder="Frameworks e.g. ISO 27001, SOC 2" value={profileForm.framework_preferences} onChange={e => setProfileForm({ ...profileForm, framework_preferences: e.target.value })} /><select className={inputClass} value={profileForm.risk_appetite} onChange={e => setProfileForm({ ...profileForm, risk_appetite: e.target.value })}><option value="conservative">Conservative</option><option value="standard">Standard</option><option value="elevated">Elevated</option></select><textarea className={`${inputClass} min-h-20 md:col-span-2`} placeholder="Organisation context" value={profileForm.organisation_context} onChange={e => setProfileForm({ ...profileForm, organisation_context: e.target.value })} /><button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-300/15 bg-violet-300/[.06] px-3 py-2 text-xs text-violet-100 md:col-span-2"><Plus className="h-3.5 w-3.5" />Create compliance profile</button></form><div className="mt-4 space-y-2">{state.profiles.map(profile => <div key={profile.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[.06] bg-black/20 p-3"><div><p className="text-xs font-medium text-white">{profile.name}</p><p className="mt-1 text-[10px] text-zinc-600">{(profile.jurisdictions || []).join(', ') || 'No jurisdiction'} · {(profile.sectors || []).join(', ') || 'Cross-sector'}</p></div><button onClick={() => remove('compliance_profiles', profile.id)} className="text-[10px] text-zinc-700 hover:text-rose-300">Remove</button></div>)}</div></div>
        <div className={panelClass}><div className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-emerald-300" /><h2 className="font-medium text-white">Operating model</h2></div><div className="mt-4 space-y-3">{[['1. Detect', 'Watch authoritative sources and preserve the exact source/version evidence.'], ['2. Triage', 'Classify the change and route it for human review without declaring applicability.'], ['3. Map', 'Connect applicable requirements to obligations, controls, evidence and owners.'], ['4. Test', 'Assess control design and operating effectiveness; surface gaps and stale evidence.'], ['5. Remediate', 'Track findings, deadlines, exceptions and accountable owners through closure.'], ['6. Prove', 'Retain version, source, decision, evidence and action history for audit and reporting.']].map(([title, body]) => <div key={title} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-xs font-medium text-white">{title}</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">{body}</p></div>)}</div></div>
      </section>
    </>}

    {tab === 'intelligence' && <section className={panelClass}><div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-cyan-300" /><h2 className="font-medium text-white">Regulatory intelligence library</h2></div><p className="mt-1 text-xs text-zinc-600">Current and historical regulations captured by verified source adapters will appear here with provenance and version history.</p><div className="mt-4 space-y-2">{state.regulations.length === 0 ? <Empty>No regulations have been ingested yet. Source declarations exist, but Sentinel will not manufacture catalogue content before verified ingestion.</Empty> : state.regulations.map(row => <div key={row.id} className="rounded-xl border border-white/[.06] bg-black/20 p-4"><div className="flex flex-wrap items-center gap-2"><Pill tone={row.status === 'in_force' ? 'green' : 'zinc'}>{row.status.replaceAll('_', ' ')}</Pill><Pill>{row.jurisdiction}</Pill><p className="text-xs font-medium text-white">{row.title}</p></div><p className="mt-2 text-xs leading-5 text-zinc-500">{row.summary || 'No source summary captured.'}</p><div className="mt-2 flex flex-wrap items-center gap-3"><span className="text-[10px] text-zinc-700">{row.source?.regulator || 'Official authority'}</span>{officialLink(row.canonical_url)}</div></div>)}</div></section>}

    {tab === 'changes' && <section className={panelClass}><div className="flex items-center gap-2"><FileClock className="h-4 w-4 text-amber-300" /><h2 className="font-medium text-white">Change Radar</h2></div><p className="mt-1 text-xs text-zinc-600">Immutable change events linked to previous/current regulatory versions and authoritative provenance.</p><div className="mt-4 space-y-2">{state.changes.length === 0 ? <Empty>No source changes have been recorded yet.</Empty> : state.changes.map(change => <div key={change.id} className="rounded-xl border border-white/[.06] bg-black/20 p-4"><div className="flex flex-wrap items-center gap-2"><Pill tone={statusTone(change.severity)}>{change.severity}</Pill><Pill>{change.change_type}</Pill>{change.review_required && <Pill tone="amber">review required</Pill>}<p className="text-xs font-medium text-white">{change.regulation?.title || 'Regulatory change'}</p></div><p className="mt-2 text-xs leading-5 text-zinc-500">{change.summary || 'Change event requires review.'}</p><div className="mt-2">{officialLink(change.regulation?.canonical_url)}</div></div>)}</div></section>}

    {tab === 'obligations' && <section className={panelClass}><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-violet-300" /><h2 className="font-medium text-white">Obligations register</h2></div><p className="mt-1 text-xs text-zinc-600">Record reviewed requirements with owners, risk, deadlines and source evidence. Creating an obligation is a governed user decision.</p><form onSubmit={submitObligation} className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4"><input required className={inputClass} placeholder="Obligation title" value={obligationForm.title} onChange={e => setObligationForm({ ...obligationForm, title: e.target.value })} /><input className={inputClass} placeholder="Jurisdiction" value={obligationForm.jurisdiction} onChange={e => setObligationForm({ ...obligationForm, jurisdiction: e.target.value })} /><input className={inputClass} placeholder="Category" value={obligationForm.category} onChange={e => setObligationForm({ ...obligationForm, category: e.target.value })} /><input className={inputClass} placeholder="Owner" value={obligationForm.owner_name} onChange={e => setObligationForm({ ...obligationForm, owner_name: e.target.value })} /><select className={inputClass} value={obligationForm.status} onChange={e => setObligationForm({ ...obligationForm, status: e.target.value })}>{['review','planned','implemented','monitoring','exception','not_applicable'].map(x => <option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select><select className={inputClass} value={obligationForm.risk_level} onChange={e => setObligationForm({ ...obligationForm, risk_level: e.target.value })}>{['low','medium','high','critical'].map(x => <option key={x}>{x}</option>)}</select><input type="date" className={inputClass} value={obligationForm.due_on} onChange={e => setObligationForm({ ...obligationForm, due_on: e.target.value })} /><input className={inputClass} placeholder="Official source URL" value={obligationForm.source_url} onChange={e => setObligationForm({ ...obligationForm, source_url: e.target.value })} /><textarea required className={`${inputClass} min-h-20 md:col-span-2 xl:col-span-4`} placeholder="Requirement / obligation text" value={obligationForm.requirement} onChange={e => setObligationForm({ ...obligationForm, requirement: e.target.value })} /><button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-300/15 bg-violet-300/[.06] px-3 py-2 text-xs text-violet-100 xl:col-span-4"><Plus className="h-3.5 w-3.5" />Add obligation</button></form><div className="mt-5 space-y-2">{state.obligations.length === 0 ? <Empty>No Sentinel obligations recorded yet.</Empty> : state.obligations.map(row => <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[.06] bg-black/20 p-4"><div><div className="flex flex-wrap items-center gap-2"><Pill tone={statusTone(row.risk_level)}>{row.risk_level}</Pill><Pill tone={statusTone(row.status)}>{row.status.replaceAll('_',' ')}</Pill><p className="text-xs font-medium text-white">{row.title}</p></div><p className="mt-2 text-xs leading-5 text-zinc-500">{row.requirement}</p><div className="mt-2 flex flex-wrap gap-3 text-[10px] text-zinc-700">{row.owner_name && <span>Owner: {row.owner_name}</span>}{row.due_on && <span>Due: {row.due_on}</span>}{officialLink(row.source_url)}</div></div><button onClick={() => remove('compliance_obligations', row.id)} className="text-[10px] text-zinc-700 hover:text-rose-300">Remove</button></div>)}</div></section>}

    {tab === 'controls' && <section className={panelClass}><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /><h2 className="font-medium text-white">Control library</h2></div><p className="mt-1 text-xs text-zinc-600">Design, implement and test controls against reviewed obligations and frameworks.</p><form onSubmit={submitControl} className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4"><input className={inputClass} placeholder="Control code" value={controlForm.control_code} onChange={e => setControlForm({ ...controlForm, control_code: e.target.value })} /><input required className={inputClass} placeholder="Control title" value={controlForm.title} onChange={e => setControlForm({ ...controlForm, title: e.target.value })} /><input className={inputClass} placeholder="Framework" value={controlForm.framework} onChange={e => setControlForm({ ...controlForm, framework: e.target.value })} /><input className={inputClass} placeholder="Owner" value={controlForm.owner_name} onChange={e => setControlForm({ ...controlForm, owner_name: e.target.value })} /><select className={inputClass} value={controlForm.control_type} onChange={e => setControlForm({ ...controlForm, control_type: e.target.value })}>{['preventive','detective','corrective','directive','compensating'].map(x => <option key={x}>{x}</option>)}</select><select className={inputClass} value={controlForm.implementation_status} onChange={e => setControlForm({ ...controlForm, implementation_status: e.target.value })}>{['planned','designed','implemented','operating','deficient','retired'].map(x => <option key={x}>{x}</option>)}</select><select className={inputClass} value={controlForm.testing_status} onChange={e => setControlForm({ ...controlForm, testing_status: e.target.value })}>{['untested','scheduled','effective','partially_effective','ineffective'].map(x => <option key={x}>{x.replaceAll('_',' ')}</option>)}</select><input className={inputClass} placeholder="Frequency" value={controlForm.frequency} onChange={e => setControlForm({ ...controlForm, frequency: e.target.value })} /><textarea className={`${inputClass} min-h-20 md:col-span-2 xl:col-span-4`} placeholder="Control description" value={controlForm.description} onChange={e => setControlForm({ ...controlForm, description: e.target.value })} /><button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-300/15 bg-emerald-300/[.06] px-3 py-2 text-xs text-emerald-100 xl:col-span-4"><Plus className="h-3.5 w-3.5" />Add control</button></form><div className="mt-5 grid gap-2 lg:grid-cols-2">{state.controls.length === 0 ? <div className="lg:col-span-2"><Empty>No controls recorded yet.</Empty></div> : state.controls.map(row => <div key={row.id} className="rounded-xl border border-white/[.06] bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Pill tone={statusTone(row.implementation_status)}>{row.implementation_status}</Pill><Pill tone={statusTone(row.testing_status)}>{row.testing_status.replaceAll('_',' ')}</Pill></div><p className="mt-2 text-xs font-medium text-white">{row.control_code ? `${row.control_code} · ` : ''}{row.title}</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">{row.description || 'No description.'}</p></div><button onClick={() => remove('compliance_controls', row.id)} className="text-[10px] text-zinc-700 hover:text-rose-300">Remove</button></div></div>)}</div></section>}

    {tab === 'findings' && <section className={panelClass}><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-300" /><h2 className="font-medium text-white">Findings & remediation</h2></div><p className="mt-1 text-xs text-zinc-600">Track control gaps, compliance issues, accountable owners, plans and deadlines through closure.</p><form onSubmit={submitFinding} className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4"><input required className={inputClass} placeholder="Finding title" value={findingForm.title} onChange={e => setFindingForm({ ...findingForm, title: e.target.value })} /><select className={inputClass} value={findingForm.severity} onChange={e => setFindingForm({ ...findingForm, severity: e.target.value })}>{['low','medium','high','critical'].map(x => <option key={x}>{x}</option>)}</select><input className={inputClass} placeholder="Owner" value={findingForm.owner_name} onChange={e => setFindingForm({ ...findingForm, owner_name: e.target.value })} /><input type="date" className={inputClass} value={findingForm.due_on} onChange={e => setFindingForm({ ...findingForm, due_on: e.target.value })} /><textarea className={`${inputClass} min-h-20 md:col-span-2`} placeholder="Finding description" value={findingForm.description} onChange={e => setFindingForm({ ...findingForm, description: e.target.value })} /><textarea className={`${inputClass} min-h-20 md:col-span-2`} placeholder="Remediation plan" value={findingForm.remediation_plan} onChange={e => setFindingForm({ ...findingForm, remediation_plan: e.target.value })} /><button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-300/15 bg-rose-300/[.05] px-3 py-2 text-xs text-rose-100 xl:col-span-4"><Plus className="h-3.5 w-3.5" />Record finding</button></form><div className="mt-5 space-y-2">{state.findings.length === 0 ? <Empty>No findings recorded.</Empty> : state.findings.map(row => <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[.06] bg-black/20 p-4"><div><div className="flex flex-wrap items-center gap-2"><Pill tone={statusTone(row.severity)}>{row.severity}</Pill><Pill tone={statusTone(row.status)}>{row.status}</Pill><p className="text-xs font-medium text-white">{row.title}</p></div><p className="mt-2 text-xs leading-5 text-zinc-500">{row.description || 'No description.'}</p>{row.remediation_plan && <p className="mt-2 text-[11px] leading-5 text-zinc-600">Plan: {row.remediation_plan}</p>}</div><button onClick={() => remove('compliance_findings', row.id)} className="text-[10px] text-zinc-700 hover:text-rose-300">Remove</button></div>)}</div></section>}

    {tab === 'sources' && <section className={panelClass}><div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-cyan-300" /><h2 className="font-medium text-white">Authoritative sources & coverage</h2></div><p className="mt-1 text-xs text-zinc-600">Coverage is explicit. A listed source means Sentinel knows the authoritative endpoint; “automated” only appears after its adapter is operationally verified.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{state.sources.map(source => <article key={source.id} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-white">{source.title}</p><p className="mt-1 text-[10px] text-zinc-600">{source.regulator} · {source.jurisdiction}</p></div><Pill tone={source.automation_ready ? 'green' : 'amber'}>{source.automation_ready ? 'automated' : 'adapter pending'}</Pill></div><div className="mt-3 flex flex-wrap gap-2"><Pill>{source.source_type}</Pill><Pill>{source.authority_level}</Pill>{source.last_error && <Pill tone="red">source error</Pill>}</div><div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-zinc-700">{source.last_success_at ? `Last success ${new Date(source.last_success_at).toLocaleString()}` : 'No verified sync yet'}</span>{officialLink(source.canonical_url)}</div></article>)}</div></section>}

    {tab === 'alerts' && <section className={panelClass}><div className="flex items-center gap-2"><BellRing className="h-4 w-4 text-amber-300" /><h2 className="font-medium text-white">Regulatory alerts</h2></div><p className="mt-1 text-xs text-zinc-600">Define alert scopes now; notifications only fire from verified ingested changes that meet the configured threshold.</p><form onSubmit={submitAlert} className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5"><input required className={inputClass} placeholder="Alert name" value={alertForm.name} onChange={e => setAlertForm({ ...alertForm, name: e.target.value })} /><input className={inputClass} placeholder="Jurisdictions" value={alertForm.jurisdictions} onChange={e => setAlertForm({ ...alertForm, jurisdictions: e.target.value })} /><input className={inputClass} placeholder="Regulators" value={alertForm.regulators} onChange={e => setAlertForm({ ...alertForm, regulators: e.target.value })} /><input className={inputClass} placeholder="Domains" value={alertForm.domains} onChange={e => setAlertForm({ ...alertForm, domains: e.target.value })} /><select className={inputClass} value={alertForm.minimum_severity} onChange={e => setAlertForm({ ...alertForm, minimum_severity: e.target.value })}>{['info','low','medium','high','critical'].map(x => <option key={x}>{x}</option>)}</select><button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-300/15 bg-amber-300/[.05] px-3 py-2 text-xs text-amber-100 md:col-span-2 xl:col-span-5"><Plus className="h-3.5 w-3.5" />Create alert</button></form><div className="mt-5 space-y-2">{state.alerts.length === 0 ? <Empty>No alert scopes configured yet.</Empty> : state.alerts.map(row => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-black/20 p-4"><div><div className="flex flex-wrap items-center gap-2"><Pill tone={row.active ? 'green' : 'zinc'}>{row.active ? 'active' : 'paused'}</Pill><Pill>{row.minimum_severity}+</Pill><p className="text-xs font-medium text-white">{row.name}</p></div><p className="mt-1 text-[10px] text-zinc-600">{(row.jurisdictions || []).join(', ') || 'All jurisdictions'} · {(row.regulators || []).join(', ') || 'All regulators'}</p></div><button onClick={() => remove('compliance_alerts', row.id)} className="text-[10px] text-zinc-700 hover:text-rose-300">Remove</button></div>)}</div></section>}

    <section className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[.03] p-5"><div className="flex items-center gap-2"><Scale className="h-4 w-4 text-cyan-200" /><h3 className="text-sm font-medium text-cyan-100">Legal Hub connection</h3></div><p className="mt-2 text-xs leading-5 text-zinc-500">Use Legal Hub for source-backed legal research and legal-context analysis. Sentinel turns reviewed regulatory requirements into a durable compliance operating model.</p><a href="/legal-hub" className="mt-3 inline-flex text-[11px] text-cyan-300">Open Legal Hub →</a></div>
      <div className="rounded-2xl border border-violet-300/10 bg-violet-300/[.03] p-5"><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-violet-200" /><h3 className="text-sm font-medium text-violet-100">Industry connection</h3></div><p className="mt-2 text-xs leading-5 text-zinc-500">Industry context helps define sector exposure and operating reality; Sentinel keeps the regulatory evidence and compliance controls separate and auditable.</p><a href="/industry-hub" className="mt-3 inline-flex text-[11px] text-violet-300">Open Industry Hub →</a></div>
      <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[.03] p-5"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-200" /><h3 className="text-sm font-medium text-amber-100">Decision boundary</h3></div><p className="mt-2 text-xs leading-5 text-zinc-500">Sentinel supports compliance operations and evidence management. It does not replace qualified legal or regulatory advice, and source changes require applicability review before action.</p></div>
    </section>
  </div>;
}
