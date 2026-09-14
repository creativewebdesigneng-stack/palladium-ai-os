-- Cover foreign keys restored by the integrated platform studio reconciliation.
create index if not exists quant_backtest_runs_strategy_fk_idx
  on public.quant_backtest_runs(strategy_id);
