import { createFileRoute } from '@tanstack/react-router';
import ComplianceAssuranceWorkbench from '@/components/compliance/ComplianceAssuranceWorkbench';
import ComplianceChangeReviewQueue from '@/components/compliance/ComplianceChangeReviewQueue';
import ComplianceSentinel from '@/screens/ComplianceSentinel';

function ComplianceSentinelPage() {
  return (
    <>
      <ComplianceSentinel />
      <ComplianceChangeReviewQueue />
      <ComplianceAssuranceWorkbench />
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
