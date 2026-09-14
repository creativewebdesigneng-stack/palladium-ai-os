import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, ExternalLink, FileCheck2,
  FileSearch2, Gauge, GitBranch, Landmark, Layers3, Plus, RefreshCcw, Scale,
  ShieldCheck, Trash2, Workflow,
} from 'lucide-react';
import {
  listComplianceControls,
  listComplianceFindings,
  listComplianceObligations,
  listComplianceProfiles,
  listComplianceRegulations,
} from '@/lib/compliance/compliance-sentinel.functions';
import {
  deleteComplianceAssuranceRecord,
  getComplianceAssuranceReport,
  listComplianceApplicability,
  listComplianceAssessments,
  listComplianceControlMappings,
  listComplianceEvidence,
  saveComplianceApplicability,
  saveComplianceAssessment,
  saveComplianceControlMapping,
  saveComplianceEvidence,
} from '@/lib/compliance/compliance-assurance.functions';

const inputClass = 'rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-400/35';
const panelClass = 'blackstar-panel rounded-[24px] border border-white/[.08] bg-black/25 p-5';
const tabs = [
  ['applicability', 'Applicability', Scale],
  ['assessments', 'Assessments', ClipboardCheck],
  ['evidence', 'Evidence', FileCheck2],
  ['mapping', 'Control Mapping', GitBranch],
  ['report', 'Assurance Report', BarChart3],
];

function Pill({ children, tone = 'zinc' }) {
  const tones = {
    zinc: 'border-white/[.08] bg-white/[.035] text-zinc-400',
    green: 'border-emerald-300/15 bg-emerald-300/[.06] text-emerald-200',
    amber: 'border-amber-300/15 bg-amber-300/[.06] text-amber-200',
    red: 'border-rose-300/15 bg-rose-300/[.06] text-rose-200',
    violet: 'border-violet-300/15 bg-violet-300/[.06] text-violet-200',
    cyan: 'border-cyan-300/15 bg-cyan-300/[.06] text-cyan-200',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${tones[tone] || tones.zinc}`}>{children}</span>;
}

function Metric({ label, value, hint, Icon, tone = 'violet' }) {
  const tones = { violet: 'text-violet-300', cyan: 'text-cyan-300', green: 'text-emerald-300', amber: 'text-amber-300', red: 'text-rose-300' };
  return <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">{label}</p><Icon className={`h-4 w-4 ${tones[tone]}`} /></div><p className="mt-3 text-2xl font-semibold text-white">{value ?? '—'}</p>{hint && <p className="mt-1 text-[11px] text-zinc-600">{hint}</p>}</div>;
}

function Empty({ children }) {
  return <div className="rounded-2xl border border-dashed border-white/10 px-4 py-7 text-center text-xs text-zinc-600">{children}</div>;
}

function tone(value) {
  if (['critical', 'ineffective', 'rejected', 'expired', 'gap'].includes(value)) return 'red';
  if (['high', 'review', 'partially_applicable', 'partial', 'partially_effective', 'unverified'].includes(value)) return 'amber';
  if (['applicable', 'implemented', 'operating', 'effective', 'verified', 'full', 'complete'].includes(value)) return 'green';
  return 'zinc';
}

export default function ComplianceAssuranceWorkbench() {
  const [tab, setTab] = useState('applicability');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState({
    profiles: [], regulations: [], obligations: [], controls: [], findings: [],
    applicability: [], assessments: [], evidence: [], mappings: [], report: null,
  });
  const [applicabilityForm, setApplicabilityForm] = useState({ profile_id: '', regulation_id: '', status: 'review', rationale: '', confidence: '', determination_source: 'human_review', reviewed_by: '', next_review_on: '' });
  const [assessmentForm, setAssessmentForm] = useState({ profile_id: '', title: '', assessment_type: 'compliance', scope: '', status: 'draft', score: '', started_at: '', completed_at: '', assessor: '', findings_summary: '' });
  const [evidenceForm, setEvidenceForm] = useState({ obligation_id: '', control_id: '', assessment_id: '', title: '', evidence_type: 'document', external_url: '', description: '', content_hash: '', valid_until: '', verification_status: 'unverified' });
  const [mappingForm, setMappingForm] = useState({ obligation_id: '', control_id: '', coverage: 'partial', notes: '' });

  async function load() {
    setBusy(true);
    try {
      const [profiles, regulations, obligations, controls, findings, applicability, assessments, evidence, mappings, report] = await Promise.all([
        listComplianceProfiles({ data: {} }),
        listComplianceRegulations({ data: { limit: 500 } }),
        listComplianceObligations({ data: {} }),
        listComplianceControls({ data: {} }),
        listComplianceFindings({ data: {} }),
        listComplianceApplicability({ data: {} }),
        listComplianceAssessments({ data: {} }),
        listComplianceEvidence({ data: {} }),
        listComplianceControlMappings({ data: {} }),
        getComplianceAssuranceReport({ data: {} }),
      ]);
      setState({ profiles, regulations, obligations, controls, findings, applicability, assessments, evidence, mappings, report });
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assurance workbench could not load.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  const mappedObligationIds = useMemo(() => new Set(state.mappings.filter(x => x.coverage !== 'gap').map(x => x.obligation_id)), [state.mappings]);
  const verifiedControlEvidenceIds = useMemo(() => new Set(state.evidence.filter(x => x.verification_status === 'verified' && x.control_id).map(x => x.control_id)), [state.evidence]);

  async function submitApplicability(e) {
    e.preventDefault(); setBusy(true);
    try {
      await saveComplianceApplicability({ data: {
        ...applicabilityForm,
        profile_id: applicabilityForm.profile_id || null,
        confidence: applicabilityForm.confidence === '' ? null : Number(applicabilityForm.confidence),
      } });
      setApplicabilityForm({ ...applicabilityForm, regulation_id: '', rationale: '', confidence: '', reviewed_by: '', next_review_on: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save applicability decision.'); }
    finally { setBusy(false); }
  }

  async function submitAssessment(e) {
    e.preventDefault(); setBusy(true);
    try {
      await saveComplianceAssessment({ data: {
        ...assessmentForm,
        profile_id: assessmentForm.profile_id || null,
        score: assessmentForm.score === '' ? null : Number(assessmentForm.score),
      } });
      setAssessmentForm({ ...assessmentForm, title: '', scope: '', score: '', assessor: '', findings_summary: '', completed_at: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save assessment.'); }
    finally { setBusy(false); }
  }

  async function submitEvidence(e) {
    e.preventDefault(); setBusy(true);
    try {
      await saveComplianceEvidence({ data: {
        ...evidenceForm,
        obligation_id: evidenceForm.obligation_id || null,
        control_id: evidenceForm.control_id || null,
        assessment_id: evidenceForm.assessment_id || null,
      } });
      setEvidenceForm({ ...evidenceForm, title: '', external_url: '', description: '', content_hash: '', valid_until: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save evidence.'); }
    finally { setBusy(false); }
  }

  async function submitMapping(e) {
    e.preventDefault(); setBusy(true);
    try {
      await saveComplianceControlMapping({ data: mappingForm });
      setMappingForm({ ...mappingForm, obligation_id: '', control_id: '', notes: '' });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save control mapping.'); }
    finally { setBusy(false); }
  }

  async function remove(table, id) {
    setBusy(true);
    try { await deleteComplianceAssuranceRecord({ data: { table, id } }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not remove assurance record.'); }
    finally { setBusy(false); }
  }

  const report = state.report || {};

  return <section className="space-y-5 border-t border-white/[.06] pt-8">
    <div className="blackstar-panel relative overflow-hidden rounded-[28px] border border-white/[.08] bg-black/35 p-6 lg:p-7">
      <div aria-hidden className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-500/[.06] blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.2em] text-cyan-300"><ShieldCheck className="h-4 w-4" /> Assurance, Evidence & Control Mapping <Pill tone="green">Tenant hardened</Pill></div><h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-tight text-white lg:text-3xl">Turn regulatory signals into governed applicability decisions, tested controls and auditable evidence.</h2><p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-500">This layer keeps human or explicitly assisted applicability decisions separate from source monitoring. Every linked profile, obligation, control, assessment and evidence record is ownership-checked before it can be connected.</p></div>
        <button onClick={load} disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] px-4 py-2.5 text-xs text-cyan-100 disabled:opacity-50"><RefreshCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh assurance</button>
      </div>
    </div>

    {error && <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[.05] px-4 py-3 text-xs text-rose-200">{error}</div>}

    <div className="flex gap-2 overflow-x-auto pb-1">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${tab === id ? 'border-cyan-300/20 bg-cyan-300/[.07] text-cyan-100' : 'border-white/[.06] bg-white/[.02] text-zinc-500 hover:text-zinc-300'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>

    {tab === 'applicability' && <section className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={submitApplicability} className={panelClass}><div className="flex items-center gap-2"><Scale className="h-4 w-4 text-violet-300" /><h3 className="font-medium text-white">Applicability decision</h3></div><p className="mt-1 text-xs leading-5 text-zinc-600">Record a governed decision. Blackstar monitoring never marks a regulation applicable by itself.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">
        <select value={applicabilityForm.profile_id} onChange={e => setApplicabilityForm({ ...applicabilityForm, profile_id: e.target.value })} className={inputClass}><option value="">All / no profile</option>{state.profiles.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select required value={applicabilityForm.regulation_id} onChange={e => setApplicabilityForm({ ...applicabilityForm, regulation_id: e.target.value })} className={inputClass}><option value="">Select regulation</option>{state.regulations.map(x => <option key={x.id} value={x.id}>{x.jurisdiction} · {x.title}</option>)}</select>
        <select value={applicabilityForm.status} onChange={e => setApplicabilityForm({ ...applicabilityForm, status: e.target.value })} className={inputClass}>{['review','applicable','partially_applicable','not_applicable','out_of_scope'].map(x => <option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select>
        <input type="number" min="0" max="1" step="0.01" value={applicabilityForm.confidence} onChange={e => setApplicabilityForm({ ...applicabilityForm, confidence: e.target.value })} placeholder="Confidence 0–1 (optional)" className={inputClass} />
        <select value={applicabilityForm.determination_source} onChange={e => setApplicabilityForm({ ...applicabilityForm, determination_source: e.target.value })} className={inputClass}><option value="human_review">Human review</option><option value="blackstar_assist">Blackstar-assisted</option><option value="imported">Imported decision</option></select>
        <input value={applicabilityForm.reviewed_by} onChange={e => setApplicabilityForm({ ...applicabilityForm, reviewed_by: e.target.value })} placeholder="Reviewer / owner" className={inputClass} />
        <input type="date" value={applicabilityForm.next_review_on} onChange={e => setApplicabilityForm({ ...applicabilityForm, next_review_on: e.target.value })} className={inputClass} />
        <textarea value={applicabilityForm.rationale} onChange={e => setApplicabilityForm({ ...applicabilityForm, rationale: e.target.value })} placeholder="Rationale, scope assumptions and source interpretation" className={`${inputClass} min-h-24 sm:col-span-2`} />
        <button disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-300/15 bg-violet-300/[.06] px-3 py-2 text-xs text-violet-100 sm:col-span-2"><Plus className="h-3.5 w-3.5" />Record applicability decision</button>
      </div></form>
      <div className={panelClass}><div className="flex items-center justify-between"><div><h3 className="font-medium text-white">Decision register</h3><p className="mt-1 text-xs text-zinc-600">{state.applicability.length} decisions</p></div><Pill tone={report.applicability?.review ? 'amber' : 'green'}>{report.applicability?.review ?? 0} review</Pill></div><div className="mt-4 space-y-2">{state.applicability.length === 0 ? <Empty>No applicability decisions recorded yet.</Empty> : state.applicability.map(row => <div key={row.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Pill tone={tone(row.status)}>{row.status.replaceAll('_',' ')}</Pill><span className="text-xs font-medium text-white">{row.regulation?.title || 'Regulation'}</span></div><p className="mt-1 text-[10px] text-zinc-600">{row.regulation?.jurisdiction}{row.profile?.name ? ` · ${row.profile.name}` : ''}{row.reviewed_by ? ` · ${row.reviewed_by}` : ''}</p>{row.rationale && <p className="mt-2 text-xs leading-5 text-zinc-500">{row.rationale}</p>}{row.regulation?.canonical_url && <a href={row.regulation.canonical_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-300/80">Official source <ExternalLink className="h-3 w-3" /></a>}</div><button onClick={() => remove('compliance_applicability', row.id)} disabled={busy} aria-label="Delete applicability decision" className="p-2 text-zinc-700 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div></div>
    </section>}

    {tab === 'assessments' && <section className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={submitAssessment} className={panelClass}><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-emerald-300" /><h3 className="font-medium text-white">Compliance assessment</h3></div><div className="mt-4 grid gap-2 sm:grid-cols-2">
        <select value={assessmentForm.profile_id} onChange={e => setAssessmentForm({ ...assessmentForm, profile_id: e.target.value })} className={inputClass}><option value="">No specific profile</option>{state.profiles.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <input required value={assessmentForm.title} onChange={e => setAssessmentForm({ ...assessmentForm, title: e.target.value })} placeholder="Assessment title" className={inputClass} />
        <select value={assessmentForm.assessment_type} onChange={e => setAssessmentForm({ ...assessmentForm, assessment_type: e.target.value })} className={inputClass}>{['compliance','control','readiness','gap','risk','vendor'].map(x => <option key={x} value={x}>{x}</option>)}</select>
        <select value={assessmentForm.status} onChange={e => setAssessmentForm({ ...assessmentForm, status: e.target.value })} className={inputClass}>{['draft','in_progress','review','complete','archived'].map(x => <option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select>
        <input type="number" min="0" max="100" step="1" value={assessmentForm.score} onChange={e => setAssessmentForm({ ...assessmentForm, score: e.target.value })} placeholder="Score 0–100" className={inputClass} />
        <input value={assessmentForm.assessor} onChange={e => setAssessmentForm({ ...assessmentForm, assessor: e.target.value })} placeholder="Assessor" className={inputClass} />
        <input type="datetime-local" value={assessmentForm.started_at} onChange={e => setAssessmentForm({ ...assessmentForm, started_at: e.target.value })} className={inputClass} />
        <input type="datetime-local" value={assessmentForm.completed_at} onChange={e => setAssessmentForm({ ...assessmentForm, completed_at: e.target.value })} className={inputClass} />
        <textarea value={assessmentForm.scope} onChange={e => setAssessmentForm({ ...assessmentForm, scope: e.target.value })} placeholder="Assessment scope" className={`${inputClass} min-h-20 sm:col-span-2`} />
        <textarea value={assessmentForm.findings_summary} onChange={e => setAssessmentForm({ ...assessmentForm, findings_summary: e.target.value })} placeholder="Findings summary / conclusion" className={`${inputClass} min-h-20 sm:col-span-2`} />
        <button disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300/15 bg-emerald-300/[.05] px-3 py-2 text-xs text-emerald-100 sm:col-span-2"><Plus className="h-3.5 w-3.5" />Save assessment</button>
      </div></form>
      <div className={panelClass}><div className="flex items-center justify-between"><div><h3 className="font-medium text-white">Assessment register</h3><p className="mt-1 text-xs text-zinc-600">Readiness, gap, risk, control and vendor assessments</p></div>{report.assessments?.averageScore !== null && report.assessments?.averageScore !== undefined && <Pill tone="cyan">Avg {report.assessments.averageScore}%</Pill>}</div><div className="mt-4 space-y-2">{state.assessments.length === 0 ? <Empty>No assessments yet.</Empty> : state.assessments.map(row => <div key={row.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Pill tone={tone(row.status)}>{row.status.replaceAll('_',' ')}</Pill><Pill>{row.assessment_type}</Pill><span className="text-xs font-medium text-white">{row.title}</span>{row.score !== null && <Pill tone="cyan">{row.score}%</Pill>}</div><p className="mt-1 text-[10px] text-zinc-600">{row.profile?.name || 'General programme'}{row.assessor ? ` · ${row.assessor}` : ''}</p>{row.findings_summary && <p className="mt-2 text-xs leading-5 text-zinc-500">{row.findings_summary}</p>}</div><button onClick={() => remove('compliance_assessments', row.id)} disabled={busy} aria-label="Delete assessment" className="p-2 text-zinc-700 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div></div>
    </section>}

    {tab === 'evidence' && <section className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={submitEvidence} className={panelClass}><div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-cyan-300" /><h3 className="font-medium text-white">Evidence vault index</h3></div><p className="mt-1 text-xs leading-5 text-zinc-600">Store evidence metadata and trusted references. Sensitive file access remains governed by the underlying storage system.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input required value={evidenceForm.title} onChange={e => setEvidenceForm({ ...evidenceForm, title: e.target.value })} placeholder="Evidence title" className={inputClass} />
        <input value={evidenceForm.evidence_type} onChange={e => setEvidenceForm({ ...evidenceForm, evidence_type: e.target.value })} placeholder="Type: document, screenshot, log..." className={inputClass} />
        <select value={evidenceForm.obligation_id} onChange={e => setEvidenceForm({ ...evidenceForm, obligation_id: e.target.value })} className={inputClass}><option value="">No linked obligation</option>{state.obligations.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
        <select value={evidenceForm.control_id} onChange={e => setEvidenceForm({ ...evidenceForm, control_id: e.target.value })} className={inputClass}><option value="">No linked control</option>{state.controls.map(x => <option key={x.id} value={x.id}>{x.control_code ? `${x.control_code} · ` : ''}{x.title}</option>)}</select>
        <select value={evidenceForm.assessment_id} onChange={e => setEvidenceForm({ ...evidenceForm, assessment_id: e.target.value })} className={inputClass}><option value="">No linked assessment</option>{state.assessments.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
        <select value={evidenceForm.verification_status} onChange={e => setEvidenceForm({ ...evidenceForm, verification_status: e.target.value })} className={inputClass}>{['unverified','verified','expired','rejected'].map(x => <option key={x} value={x}>{x}</option>)}</select>
        <input value={evidenceForm.external_url} onChange={e => setEvidenceForm({ ...evidenceForm, external_url: e.target.value })} placeholder="Trusted evidence URL (optional)" className={inputClass} />
        <input type="date" value={evidenceForm.valid_until} onChange={e => setEvidenceForm({ ...evidenceForm, valid_until: e.target.value })} className={inputClass} />
        <input value={evidenceForm.content_hash} onChange={e => setEvidenceForm({ ...evidenceForm, content_hash: e.target.value })} placeholder="Content hash / integrity reference" className={`${inputClass} sm:col-span-2`} />
        <textarea value={evidenceForm.description} onChange={e => setEvidenceForm({ ...evidenceForm, description: e.target.value })} placeholder="What this evidence proves, collection method and limitations" className={`${inputClass} min-h-24 sm:col-span-2`} />
        <button disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] px-3 py-2 text-xs text-cyan-100 sm:col-span-2"><Plus className="h-3.5 w-3.5" />Index evidence</button>
      </div></form>
      <div className={panelClass}><div className="flex items-center justify-between"><div><h3 className="font-medium text-white">Evidence register</h3><p className="mt-1 text-xs text-zinc-600">{report.evidence?.verified ?? 0} verified · {report.evidence?.expired ?? 0} expired</p></div><Pill tone={report.evidence?.expiringWithin30Days ? 'amber' : 'green'}>{report.evidence?.expiringWithin30Days ?? 0} expiring soon</Pill></div><div className="mt-4 space-y-2">{state.evidence.length === 0 ? <Empty>No evidence indexed yet.</Empty> : state.evidence.map(row => <div key={row.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Pill tone={tone(row.verification_status)}>{row.verification_status}</Pill><Pill>{row.evidence_type}</Pill><span className="text-xs font-medium text-white">{row.title}</span></div><p className="mt-1 text-[10px] text-zinc-600">{row.obligation?.title || row.control?.title || row.assessment?.title || 'Programme-level evidence'}{row.valid_until ? ` · valid until ${row.valid_until}` : ''}</p>{row.description && <p className="mt-2 text-xs leading-5 text-zinc-500">{row.description}</p>}{row.external_url && <a href={row.external_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-300/80">Open evidence reference <ExternalLink className="h-3 w-3" /></a>}</div><button onClick={() => remove('compliance_evidence', row.id)} disabled={busy} aria-label="Delete evidence" className="p-2 text-zinc-700 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div></div>
    </section>}

    {tab === 'mapping' && <section className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
      <form onSubmit={submitMapping} className={panelClass}><div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-amber-300" /><h3 className="font-medium text-white">Obligation → control mapping</h3></div><div className="mt-4 grid gap-2">
        <select required value={mappingForm.obligation_id} onChange={e => setMappingForm({ ...mappingForm, obligation_id: e.target.value })} className={inputClass}><option value="">Select obligation</option>{state.obligations.map(x => <option key={x.id} value={x.id}>{x.risk_level} · {x.title}</option>)}</select>
        <select required value={mappingForm.control_id} onChange={e => setMappingForm({ ...mappingForm, control_id: e.target.value })} className={inputClass}><option value="">Select control</option>{state.controls.map(x => <option key={x.id} value={x.id}>{x.control_code ? `${x.control_code} · ` : ''}{x.title}</option>)}</select>
        <select value={mappingForm.coverage} onChange={e => setMappingForm({ ...mappingForm, coverage: e.target.value })} className={inputClass}>{['full','partial','supporting','gap'].map(x => <option key={x} value={x}>{x}</option>)}</select>
        <textarea value={mappingForm.notes} onChange={e => setMappingForm({ ...mappingForm, notes: e.target.value })} placeholder="Coverage rationale, exceptions or testing notes" className={`${inputClass} min-h-24`} />
        <button disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300/15 bg-amber-300/[.05] px-3 py-2 text-xs text-amber-100"><Plus className="h-3.5 w-3.5" />Map control</button>
      </div></form>
      <div className={panelClass}><div className="flex items-center justify-between"><div><h3 className="font-medium text-white">Coverage map</h3><p className="mt-1 text-xs text-zinc-600">One obligation can be supported by multiple controls.</p></div><Pill tone={report.obligations?.unmapped ? 'amber' : 'green'}>{report.obligations?.unmapped ?? 0} unmapped</Pill></div><div className="mt-4 space-y-2">{state.mappings.length === 0 ? <Empty>No obligation/control mappings yet.</Empty> : state.mappings.map(row => <div key={row.id} className="rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Pill tone={tone(row.coverage)}>{row.coverage}</Pill><span className="text-xs font-medium text-white">{row.obligation?.title || 'Obligation'}</span><span className="text-zinc-700">→</span><span className="text-xs text-zinc-300">{row.control?.control_code ? `${row.control.control_code} · ` : ''}{row.control?.title || 'Control'}</span></div><p className="mt-1 text-[10px] text-zinc-600">Control: {row.control?.implementation_status || 'unknown'} · test {row.control?.testing_status || 'unknown'}</p>{row.notes && <p className="mt-2 text-xs text-zinc-500">{row.notes}</p>}</div><button onClick={() => remove('compliance_control_mappings', row.id)} disabled={busy} aria-label="Delete control mapping" className="p-2 text-zinc-700 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div></div>
    </section>}

    {tab === 'report' && <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Applicability review" value={report.applicability?.review ?? 0} hint={`${report.applicability?.applicable ?? 0} applicable / partial`} Icon={Scale} tone="amber" />
        <Metric label="Unmapped obligations" value={report.obligations?.unmapped ?? 0} hint={`${report.obligations?.criticalOpen ?? 0} critical open`} Icon={Layers3} tone="red" />
        <Metric label="Ineffective controls" value={report.controls?.ineffective ?? 0} hint={`${report.controls?.withoutVerifiedEvidence ?? 0} without verified evidence`} Icon={ShieldCheck} tone="red" />
        <Metric label="Assessment score" value={report.assessments?.averageScore === null || report.assessments?.averageScore === undefined ? '—' : `${report.assessments.averageScore}%`} hint={`${report.assessments?.open ?? 0} assessments open`} Icon={Gauge} tone="cyan" />
        <Metric label="Evidence expiry" value={report.evidence?.expiringWithin30Days ?? 0} hint={`${report.evidence?.expired ?? 0} expired`} Icon={FileSearch2} tone="amber" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={panelClass}><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-300" /><h3 className="font-medium text-white">Assurance attention queue</h3></div><div className="mt-4 space-y-2">
          {state.obligations.filter(x => x.status !== 'not_applicable' && !mappedObligationIds.has(x.id)).slice(0, 6).map(x => <div key={x.id} className="rounded-xl border border-amber-300/10 bg-amber-300/[.035] p-3"><p className="text-xs font-medium text-amber-100">Unmapped obligation · {x.title}</p><p className="mt-1 text-[10px] text-zinc-600">Risk {x.risk_level} · status {x.status}</p></div>)}
          {state.controls.filter(x => !verifiedControlEvidenceIds.has(x.id)).slice(0, 6).map(x => <div key={x.id} className="rounded-xl border border-cyan-300/10 bg-cyan-300/[.03] p-3"><p className="text-xs font-medium text-cyan-100">Evidence gap · {x.control_code ? `${x.control_code} · ` : ''}{x.title}</p><p className="mt-1 text-[10px] text-zinc-600">Implementation {x.implementation_status} · testing {x.testing_status}</p></div>)}
          {report.obligations?.unmapped === 0 && report.controls?.withoutVerifiedEvidence === 0 && <Empty>No current mapping or verified-evidence gaps.</Empty>}
        </div></div>
        <div className={panelClass}><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /><h3 className="font-medium text-white">Connected Blackstar handoffs</h3></div><p className="mt-2 text-xs leading-5 text-zinc-600">Sentinel stays focused on compliance operations and hands specialist work to existing Blackstar systems instead of duplicating them.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a href="/legal-hub" className="rounded-xl border border-violet-300/10 bg-violet-300/[.035] p-3 transition hover:border-violet-300/20"><div className="flex items-center gap-2 text-xs font-medium text-violet-100"><Scale className="h-3.5 w-3.5" />Legal Hub</div><p className="mt-1 text-[10px] leading-4 text-zinc-600">Source-backed legal research, rights, obligations and legal interpretation workflows.</p></a>
          <a href="/industry-hub" className="rounded-xl border border-cyan-300/10 bg-cyan-300/[.03] p-3 transition hover:border-cyan-300/20"><div className="flex items-center gap-2 text-xs font-medium text-cyan-100"><Landmark className="h-3.5 w-3.5" />Industry Hub</div><p className="mt-1 text-[10px] leading-4 text-zinc-600">Sector context, operating models, standards, value chains and industry-specific risks.</p></a>
          <a href="/finance" className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.03] p-3 transition hover:border-emerald-300/20"><div className="flex items-center gap-2 text-xs font-medium text-emerald-100"><BarChart3 className="h-3.5 w-3.5" />Finance Hub</div><p className="mt-1 text-[10px] leading-4 text-zinc-600">Quantify remediation cost, budgets, scenarios, exposure and control investment.</p></a>
          <a href="/workflows" className="rounded-xl border border-amber-300/10 bg-amber-300/[.03] p-3 transition hover:border-amber-300/20"><div className="flex items-center gap-2 text-xs font-medium text-amber-100"><Workflow className="h-3.5 w-3.5" />Workflows</div><p className="mt-1 text-[10px] leading-4 text-zinc-600">Turn approved remediation plans and recurring evidence collection into execution workflows.</p></a>
        </div></div>
      </section>
      <p className="text-[10px] leading-5 text-zinc-700">Report generated {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'when data is loaded'}. This is operational compliance support, not a substitute for qualified legal or regulatory advice.</p>
    </div>}
  </section>;
}
