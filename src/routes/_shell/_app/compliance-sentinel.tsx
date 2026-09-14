import { createFileRoute } from '@tanstack/react-router';
import ComplianceSentinel from '@/screens/ComplianceSentinel';

export const Route = createFileRoute('/_shell/_app/compliance-sentinel')({
  head: () => ({
    meta: [
      { title: 'Regulations & Compliance Sentinel — Blackstar' },
      { name: 'description', content: 'Authoritative regulatory intelligence, historical change tracking, obligations, controls, evidence, assessments, remediation and compliance monitoring.' },
    ],
  }),
  component: ComplianceSentinel,
});
