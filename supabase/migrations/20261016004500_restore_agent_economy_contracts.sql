-- Add ownership guarantees to the EXISTING Blackstar economy tables.
-- Production already has both tables, RLS, and a composite account/ledger FK.
-- Do not recreate tables, policies, ledger records or payment infrastructure.
do $$ begin
 if to_regclass('public.agent_economy_accounts') is null
 or to_regclass('public.agent_economy_entries') is null
 or to_regclass('public.personal_agents') is null
 then raise exception 'Missing existing agent economy dependencies; apply original schema recovery first';
 end if;
end $$;

create unique index if not exists personal_agents_user_id_id_economy_uq
 on public.personal_agents(user_id,id);

-- Reject orphan/misattributed agents rather than silently changing ownership.
alter table public.agent_economy_accounts
 add constraint agent_economy_account_owned_agent_fk
 foreign key(user_id,agent_id)
 references public.personal_agents(user_id,id)
 on delete cascade;

alter table public.agent_economy_entries
 add constraint agent_economy_counterparty_owned_agent_fk
 foreign key(user_id,counterparty_agent_id)
 references public.personal_agents(user_id,id);

-- No grants, policy replacement, account creation, balance mutation or settlement.
