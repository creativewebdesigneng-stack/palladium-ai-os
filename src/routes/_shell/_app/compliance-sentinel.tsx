import { createFileRoute } from '@tanstack/react-router';
import ComplianceAssuranceWorkbench from '@/components/compliance/ComplianceAssuranceWorkbench';
import ComplianceSentinel from '@/screens/ComplianceSentinel';

function ComplianceSentinelPage() {
  return (
    <>
      <ComplianceSentinel />
      <ComplianceAssuranceWorkbench />
    </>
  );
}

export const Route = createFileRoute('/_shell/_app/compliance-sentinel')({
  head: () => ({
    meta: [
      { title: 'Regulations & Compliance Sentinel — Blackstar' },
      { name: 'description', content: 'Authoritative regulatory intelligence, historical change tracking, applicability, obligations, controls, evidence, assessments, remediation and continuous compliance monitoring.' },
    ],
  }),
  component: ComplianceSentinelPage,
});
