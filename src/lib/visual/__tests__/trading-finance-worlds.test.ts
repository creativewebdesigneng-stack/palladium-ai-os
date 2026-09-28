import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const tradingScreen=readFileSync(new URL('../../../screens/TradingHub.jsx',import.meta.url),'utf8');
const tradingWorld=readFileSync(new URL('../../../components/trading/TradingGlobalWorld.jsx',import.meta.url),'utf8');
const financeScreen=readFileSync(new URL('../../../screens/Finance.jsx',import.meta.url),'utf8');
const financeWorld=readFileSync(new URL('../../../components/finance/FinanceLedgerWorld.jsx',import.meta.url),'utf8');

describe('Trading and Finance visual worlds',()=>{
  it('keeps Trading visuals as a truthful reference topology rather than live market data',()=>{
    expect(tradingScreen).toContain('venues={GLOBAL_TRADING_VENUES}');
    expect(tradingScreen).toContain('authorities={TRADING_AUTHORITIES}');
    expect(tradingWorld).toContain('not a live price feed');
    expect(tradingWorld).toContain('provider-gated market data remains explicitly separate');
  });

  it('drives Finance visuals from the authenticated ledger query result',()=>{
    expect(financeScreen).toContain('<FinanceLedgerWorld transactions={transactions} summary={summary} currency={currency} />');
    expect(financeWorld).toContain("transactions.filter((row)=>row.direction==='income')");
    expect(financeWorld).toContain("transactions.filter((row)=>row.status==='pending')");
    expect(financeWorld).toContain('no inferred bank balance or live valuation');
  });

  it('respects reduced motion',()=>{
    expect(tradingWorld).toContain('useReducedMotion');
    expect(financeWorld).toContain('useReducedMotion');
  });
});
