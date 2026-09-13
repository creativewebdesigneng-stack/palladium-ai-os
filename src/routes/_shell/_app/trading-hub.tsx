import { createFileRoute } from '@tanstack/react-router';
import TradingHub from '@/screens/TradingHub';

export const Route = createFileRoute('/_shell/_app/trading-hub')({
  head: () => ({
    meta: [
      { title: 'Trading Research Hub — Blackstar' },
      { name: 'description', content: 'Research-only global markets, exchanges, education, portfolio context, risk planning and strategy testing. No trade execution.' },
    ],
  }),
  component: TradingHub,
});
