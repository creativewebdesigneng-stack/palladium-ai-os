import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runtime = readFileSync(fileURLToPath(new URL('../quant-studio.functions.ts', import.meta.url)), 'utf8');
const migration = readFileSync(fileURLToPath(new URL('../../../../supabase/migrations/20260829003000_integrated_platform_studios.sql', import.meta.url)), 'utf8');

describe('Quant Studio production contract', () => {
  it('persists owner-scoped strategy and backtest records behind RLS', () => {
    expect(migration).toContain('create table if not exists public.quant_strategies');
    expect(migration).toContain('create table if not exists public.quant_backtest_runs');
    expect(migration).toContain('alter table public.quant_strategies enable row level security');
    expect(migration).toContain('alter table public.quant_backtest_runs enable row level security');
    expect(migration).toContain('auth.uid() = user_id');
    expect(runtime).toContain(".eq('user_id', context.userId)");
  });

  it('requires real supplied historical observations instead of fabricating prices', () => {
    expect(runtime).toContain('returns: z.array(returnPoint).min(2).max(5000)');
    expect(runtime).toContain("throw new Error('At least two real historical return observations are required inside the selected period.')");
    expect(runtime).toContain("execution: 'research-only'");
    expect(runtime).not.toContain('Math.random');
  });

  it('computes deterministic research risk metrics and audits completion', () => {
    expect(runtime).toContain('annualizedVolatilityPct');
    expect(runtime).toContain('maxDrawdownPct');
    expect(runtime).toContain('sharpe');
    expect(runtime).toContain("action: 'quant.backtest_completed'");
  });
});
