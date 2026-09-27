import { Suspense, lazy } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import ComplianceSentinel from '@/screens/ComplianceSentinel';

const ChangeReviewQueue = lazy(() => import('@/components/compliance/ComplianceChangeReviewQueue'));
const AssuranceWorkbench = lazy(() => import('@/components/compliance/ComplianceAssuranceWorkbench'));

function ComplianceModuleFallback({ label }: { label: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5 text-xs text-zinc-500">
      Loading {label}…
    </div>
  );
}

function ComplianceSentinelPage() {
  return (
    <>
      <ComplianceSentinel />
      <Suspense fallback={<ComplianceModuleFallback label="change review queue" />}>
        <div className="mt-6"><ChangeReviewQueue /></div>
      </Suspense>
      <Suspense fallback={<ComplianceModuleFallback label="assurance workbench" />}>
        <div className="mt-6"><AssuranceWorkbench /></div>
      </Suspense>
    </>
  );
}

export const Route = createFileRoute('/_shell/_app/compliance-sentinel')({
  head: () => ({
    meta: [
      { title: 'Regulations & Compliance Sentinel — Blackstar' },
      { name: 'description', content: 'Authoritative regulatory intelligence with verified official-source feeds, historical change tracking, automated change alerts, governed applicability review, obligations, controls, evidence, assessments, remediation and continuous compliance monitoring.' },
    ],
  }),
  component: ComplianceSentinelPage,
});
