-- Cover the full composite ledger/account identity FK, in addition to its history query index.
create index agent_economy_entries_account_identity_idx
 on public.agent_economy_entries(account_id,user_id,agent_id,currency);
