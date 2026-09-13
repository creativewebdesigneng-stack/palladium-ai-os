import { createFileRoute } from '@tanstack/react-router';
import CompanyHub from '@/screens/CompanyHub';

export const Route = createFileRoute('/_shell/_app/company-hub')({
  head: () => ({
    meta: [
      { title: 'Company Hub — Blackstar' },
      { name: 'description', content: 'Company-wide strategy, operations, AI workforce, growth, finance, legal, risk and execution orchestration.' },
    ],
  }),
  component: CompanyHub,
});
