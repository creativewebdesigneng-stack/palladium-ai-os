-- Recover existing customer operations contracts without importing contacts, messages or provider credentials.
do $$ begin
 if to_regclass('public.crm_contacts') is not null or to_regclass('public.crm_activities') is not null or to_regclass('public.crm_field_definitions') is not null or to_regclass('public.crm_saved_views') is not null or to_regclass('public.support_inboxes') is not null or to_regclass('public.support_tickets') is not null or to_regclass('public.support_messages') is not null or to_regclass('public.support_canned_responses') is not null or to_regclass('public.support_help_articles') is not null or to_regclass('public.whatsapp_conversations') is not null or to_regclass('public.whatsapp_messages') is not null or to_regclass('public.whatsapp_broadcasts') is not null or to_regclass('public.whatsapp_broadcast_recipients') is not null then
 raise exception 'Customer operations recovery requires all thirteen tables absent; review partial state first.';
 end if;
end $$;

-- Contract: 20260814131853_9f3de9ad-03e6-4a21-8081-107369c20776.sql

CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  title text,
  stage text NOT NULL DEFAULT 'lead',
  value_gbp numeric NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  source text,
  last_contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contract: 20260814131853_9f3de9ad-03e6-4a21-8081-107369c20776.sql

CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'note',
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Contract: 20260829134000_crm_customisation.sql

create table public.crm_field_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,62}$'),
  label text not null check (char_length(label) between 1 and 120),
  field_type text not null check (field_type in ('text','number','date','boolean','select','multi_select','url','email','phone')),
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, key)
);

-- Contract: 20260829134000_crm_customisation.sql

create table public.crm_saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  filters jsonb not null default '{}'::jsonb,
  columns jsonb not null default '[]'::jsonb,
  sort_config jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260829235000_customer_support_3d_studio.sql

create table public.support_inboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  channel text not null check (channel in ('web','email','chat','phone','whatsapp','facebook','instagram','telegram','line','sms','api','other')),
  integration_provider text,
  integration_connection_id text,
  business_hours jsonb not null default '{}'::jsonb,
  auto_assignment boolean not null default false,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260814131853_9f3de9ad-03e6-4a21-8081-107369c20776.sql

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text,
  requester_name text,
  requester_email text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  channel text NOT NULL DEFAULT 'web',
  assignee text,
  satisfaction integer,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contract: 20260814131853_9f3de9ad-03e6-4a21-8081-107369c20776.sql

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_role text NOT NULL DEFAULT 'agent',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Contract: 20260829235000_customer_support_3d_studio.sql

create table public.support_canned_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  shortcut text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, shortcut)
);

-- Contract: 20260829235000_customer_support_3d_studio.sql

create table public.support_help_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  slug text not null,
  summary text,
  body_markdown text not null default '',
  locale text not null default 'en',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug, locale)
);

-- Contract: 20260828190000_whatsapp_crm.sql

create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  provider text not null default 'whatsapp',
  external_thread_id text,
  status text not null default 'open' check (status in ('open','pending','closed')),
  assigned_agent_id uuid,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, contact_id, provider)
);

-- Contract: 20260828190000_whatsapp_crm.sql

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  content_type text not null default 'text' check (content_type in ('text','template','image','video','document','audio','interactive','system')),
  text_content text,
  external_message_id text,
  reply_to_message_id uuid references public.whatsapp_messages(id) on delete set null,
  media jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sent','delivered','read','failed','received')),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260828190000_whatsapp_crm.sql

create table public.whatsapp_broadcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  template_name text,
  template_language text,
  body_preview text,
  status text not null default 'draft' check (status in ('draft','scheduled','approval_required','sending','sent','paused','failed','cancelled')),
  scheduled_for timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260828190000_whatsapp_crm.sql

create table public.whatsapp_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  broadcast_id uuid not null references public.whatsapp_broadcasts(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approval_required','sent','delivered','read','failed','skipped')),
  external_message_id text,
  last_error text,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(broadcast_id, contact_id)
);

alter table public.crm_contacts add column custom_values jsonb not null default '{}'::jsonb;

alter table public.support_tickets
  add column inbox_id uuid references public.support_inboxes(id) on delete set null,
  add column crm_contact_id uuid references public.crm_contacts(id) on delete set null,
  add column external_thread_id text,
  add column assigned_team text,
  add column labels text[] not null default '{}',
  add column unread_count integer not null default 0,
  add column metadata jsonb not null default '{}'::jsonb;

alter table public.support_messages
  add column private_note boolean not null default false,
  add column external_message_id text,
  add column delivery_status text,
  add column metadata jsonb not null default '{}'::jsonb;

CREATE INDEX crm_contacts_user_idx ON public.crm_contacts(user_id, created_at DESC);

CREATE TRIGGER crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX crm_activities_contact_idx ON public.crm_activities(contact_id, occurred_at DESC);

create index if not exists crm_field_definitions_user_idx on public.crm_field_definitions(user_id, is_active, sort_order);

create trigger crm_field_definitions_updated_at before update on public.crm_field_definitions
for each row execute function public.set_updated_at();

create index if not exists crm_saved_views_user_idx on public.crm_saved_views(user_id, created_at desc);

create trigger crm_saved_views_updated_at before update on public.crm_saved_views
for each row execute function public.set_updated_at();

create index if not exists support_inboxes_user_idx on public.support_inboxes(user_id, status);

CREATE INDEX support_tickets_user_idx ON public.support_tickets(user_id, created_at DESC);

CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX support_messages_ticket_idx ON public.support_messages(ticket_id, created_at);

create index if not exists support_help_articles_user_status_idx on public.support_help_articles(user_id, status, updated_at desc);

create index if not exists whatsapp_conversations_user_last_idx on public.whatsapp_conversations(user_id, last_message_at desc nulls last);

create index if not exists whatsapp_messages_conversation_created_idx on public.whatsapp_messages(conversation_id, created_at desc);

create index if not exists whatsapp_broadcasts_user_created_idx on public.whatsapp_broadcasts(user_id, created_at desc);

create index if not exists whatsapp_broadcast_recipients_broadcast_idx on public.whatsapp_broadcast_recipients(broadcast_id, status);

create index if not exists crm_contacts_custom_values_gin on public.crm_contacts using gin(custom_values);

create index if not exists support_tickets_inbox_idx on public.support_tickets(inbox_id, created_at desc);

create index if not exists support_tickets_crm_contact_idx on public.support_tickets(crm_contact_id, created_at desc);

create index crm_contacts_org_id_recovery_idx on public.crm_contacts(org_id);

create index crm_activities_user_id_recovery_idx on public.crm_activities(user_id);

create index support_tickets_org_id_recovery_idx on public.support_tickets(org_id);

create index support_messages_user_id_recovery_idx on public.support_messages(user_id);

create index whatsapp_conversations_contact_id_recovery_idx on public.whatsapp_conversations(contact_id);

create index whatsapp_messages_reply_to_message_id_recovery_idx on public.whatsapp_messages(reply_to_message_id,user_id,conversation_id);

create index whatsapp_broadcast_recipients_contact_id_recovery_idx on public.whatsapp_broadcast_recipients(contact_id);

alter table public.crm_contacts enable row level security;

revoke all on public.crm_contacts from public,anon,authenticated;

grant select,insert,update,delete on public.crm_contacts to authenticated;

grant all on public.crm_contacts to service_role;

create policy crm_contacts_select_own on public.crm_contacts for select to authenticated using(user_id=(select auth.uid()));

create policy crm_contacts_insert_own on public.crm_contacts for insert to authenticated  with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));

create policy crm_contacts_update_own on public.crm_contacts for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));

create policy crm_contacts_delete_own on public.crm_contacts for delete to authenticated using(user_id=(select auth.uid()));

alter table public.crm_activities enable row level security;

revoke all on public.crm_activities from public,anon,authenticated;

grant select,insert,delete on public.crm_activities to authenticated;

grant all on public.crm_activities to service_role;

create policy crm_activities_select_own on public.crm_activities for select to authenticated using(user_id=(select auth.uid()));

create policy crm_activities_insert_own on public.crm_activities for insert to authenticated  with check(user_id=(select auth.uid()) and (exists(select 1 from public.crm_contacts p where p.id=crm_activities.contact_id and p.user_id=(select auth.uid()))));

create policy crm_activities_delete_own on public.crm_activities for delete to authenticated using(user_id=(select auth.uid()));

alter table public.crm_field_definitions enable row level security;

revoke all on public.crm_field_definitions from public,anon,authenticated;

grant select,insert,update,delete on public.crm_field_definitions to authenticated;

grant all on public.crm_field_definitions to service_role;

create policy crm_field_definitions_select_own on public.crm_field_definitions for select to authenticated using(user_id=(select auth.uid()));

create policy crm_field_definitions_insert_own on public.crm_field_definitions for insert to authenticated  with check(user_id=(select auth.uid()));

create policy crm_field_definitions_update_own on public.crm_field_definitions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy crm_field_definitions_delete_own on public.crm_field_definitions for delete to authenticated using(user_id=(select auth.uid()));

alter table public.crm_saved_views enable row level security;

revoke all on public.crm_saved_views from public,anon,authenticated;

grant select,insert,update,delete on public.crm_saved_views to authenticated;

grant all on public.crm_saved_views to service_role;

create policy crm_saved_views_select_own on public.crm_saved_views for select to authenticated using(user_id=(select auth.uid()));

create policy crm_saved_views_insert_own on public.crm_saved_views for insert to authenticated  with check(user_id=(select auth.uid()));

create policy crm_saved_views_update_own on public.crm_saved_views for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy crm_saved_views_delete_own on public.crm_saved_views for delete to authenticated using(user_id=(select auth.uid()));

alter table public.support_inboxes enable row level security;

revoke all on public.support_inboxes from public,anon,authenticated;

grant select,insert,update,delete on public.support_inboxes to authenticated;

grant all on public.support_inboxes to service_role;

create policy support_inboxes_select_own on public.support_inboxes for select to authenticated using(user_id=(select auth.uid()));

create policy support_inboxes_insert_own on public.support_inboxes for insert to authenticated  with check(user_id=(select auth.uid()));

create policy support_inboxes_update_own on public.support_inboxes for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy support_inboxes_delete_own on public.support_inboxes for delete to authenticated using(user_id=(select auth.uid()));

alter table public.support_tickets enable row level security;

revoke all on public.support_tickets from public,anon,authenticated;

grant select,insert,update,delete on public.support_tickets to authenticated;

grant all on public.support_tickets to service_role;

create policy support_tickets_select_own on public.support_tickets for select to authenticated using(user_id=(select auth.uid()));

create policy support_tickets_insert_own on public.support_tickets for insert to authenticated  with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)) and (inbox_id is null or exists(select 1 from public.support_inboxes p where p.id=support_tickets.inbox_id and p.user_id=(select auth.uid()))) and (crm_contact_id is null or exists(select 1 from public.crm_contacts p where p.id=support_tickets.crm_contact_id and p.user_id=(select auth.uid()))));

create policy support_tickets_update_own on public.support_tickets for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)) and (inbox_id is null or exists(select 1 from public.support_inboxes p where p.id=support_tickets.inbox_id and p.user_id=(select auth.uid()))) and (crm_contact_id is null or exists(select 1 from public.crm_contacts p where p.id=support_tickets.crm_contact_id and p.user_id=(select auth.uid()))));

create policy support_tickets_delete_own on public.support_tickets for delete to authenticated using(user_id=(select auth.uid()));

alter table public.support_messages enable row level security;

revoke all on public.support_messages from public,anon,authenticated;

grant select,insert,delete on public.support_messages to authenticated;

grant all on public.support_messages to service_role;

create policy support_messages_select_own on public.support_messages for select to authenticated using(user_id=(select auth.uid()));

create policy support_messages_insert_own on public.support_messages for insert to authenticated  with check(user_id=(select auth.uid()) and (exists(select 1 from public.support_tickets p where p.id=support_messages.ticket_id and p.user_id=(select auth.uid()))));

create policy support_messages_delete_own on public.support_messages for delete to authenticated using(user_id=(select auth.uid()));

alter table public.support_canned_responses enable row level security;

revoke all on public.support_canned_responses from public,anon,authenticated;

grant select,insert,update,delete on public.support_canned_responses to authenticated;

grant all on public.support_canned_responses to service_role;

create policy support_canned_responses_select_own on public.support_canned_responses for select to authenticated using(user_id=(select auth.uid()));

create policy support_canned_responses_insert_own on public.support_canned_responses for insert to authenticated  with check(user_id=(select auth.uid()));

create policy support_canned_responses_update_own on public.support_canned_responses for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy support_canned_responses_delete_own on public.support_canned_responses for delete to authenticated using(user_id=(select auth.uid()));

alter table public.support_help_articles enable row level security;

revoke all on public.support_help_articles from public,anon,authenticated;

grant select,insert,update,delete on public.support_help_articles to authenticated;

grant all on public.support_help_articles to service_role;

create policy support_help_articles_select_own on public.support_help_articles for select to authenticated using(user_id=(select auth.uid()));

create policy support_help_articles_insert_own on public.support_help_articles for insert to authenticated  with check(user_id=(select auth.uid()));

create policy support_help_articles_update_own on public.support_help_articles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy support_help_articles_delete_own on public.support_help_articles for delete to authenticated using(user_id=(select auth.uid()));

alter table public.whatsapp_conversations enable row level security;

revoke all on public.whatsapp_conversations from public,anon,authenticated;

grant select,insert,update,delete on public.whatsapp_conversations to authenticated;

grant all on public.whatsapp_conversations to service_role;

create policy whatsapp_conversations_select_own on public.whatsapp_conversations for select to authenticated using(user_id=(select auth.uid()));

create policy whatsapp_conversations_insert_own on public.whatsapp_conversations for insert to authenticated  with check(user_id=(select auth.uid()) and (exists(select 1 from public.crm_contacts p where p.id=whatsapp_conversations.contact_id and p.user_id=(select auth.uid()))) and (assigned_agent_id is null or exists(select 1 from public.personal_agents p where p.id=whatsapp_conversations.assigned_agent_id and p.user_id=(select auth.uid()))));

create policy whatsapp_conversations_update_own on public.whatsapp_conversations for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (exists(select 1 from public.crm_contacts p where p.id=whatsapp_conversations.contact_id and p.user_id=(select auth.uid()))) and (assigned_agent_id is null or exists(select 1 from public.personal_agents p where p.id=whatsapp_conversations.assigned_agent_id and p.user_id=(select auth.uid()))));

create policy whatsapp_conversations_delete_own on public.whatsapp_conversations for delete to authenticated using(user_id=(select auth.uid()));

alter table public.whatsapp_messages enable row level security;

revoke all on public.whatsapp_messages from public,anon,authenticated;

grant select,insert,update,delete on public.whatsapp_messages to authenticated;

grant all on public.whatsapp_messages to service_role;

create policy whatsapp_messages_select_own on public.whatsapp_messages for select to authenticated using(user_id=(select auth.uid()));

create policy whatsapp_messages_insert_own on public.whatsapp_messages for insert to authenticated  with check(user_id=(select auth.uid()) and (exists(select 1 from public.whatsapp_conversations p where p.id=whatsapp_messages.conversation_id and p.user_id=(select auth.uid()))));

create policy whatsapp_messages_update_own on public.whatsapp_messages for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (exists(select 1 from public.whatsapp_conversations p where p.id=whatsapp_messages.conversation_id and p.user_id=(select auth.uid()))));

create policy whatsapp_messages_delete_own on public.whatsapp_messages for delete to authenticated using(user_id=(select auth.uid()));

alter table public.whatsapp_broadcasts enable row level security;

revoke all on public.whatsapp_broadcasts from public,anon,authenticated;

grant select,insert,update,delete on public.whatsapp_broadcasts to authenticated;

grant all on public.whatsapp_broadcasts to service_role;

create policy whatsapp_broadcasts_select_own on public.whatsapp_broadcasts for select to authenticated using(user_id=(select auth.uid()));

create policy whatsapp_broadcasts_insert_own on public.whatsapp_broadcasts for insert to authenticated  with check(user_id=(select auth.uid()));

create policy whatsapp_broadcasts_update_own on public.whatsapp_broadcasts for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy whatsapp_broadcasts_delete_own on public.whatsapp_broadcasts for delete to authenticated using(user_id=(select auth.uid()));

alter table public.whatsapp_broadcast_recipients enable row level security;

revoke all on public.whatsapp_broadcast_recipients from public,anon,authenticated;

grant select,insert,update,delete on public.whatsapp_broadcast_recipients to authenticated;

grant all on public.whatsapp_broadcast_recipients to service_role;

create policy whatsapp_broadcast_recipients_select_own on public.whatsapp_broadcast_recipients for select to authenticated using(user_id=(select auth.uid()));

create policy whatsapp_broadcast_recipients_insert_own on public.whatsapp_broadcast_recipients for insert to authenticated  with check(user_id=(select auth.uid()) and (exists(select 1 from public.whatsapp_broadcasts p where p.id=whatsapp_broadcast_recipients.broadcast_id and p.user_id=(select auth.uid()))) and (exists(select 1 from public.crm_contacts p where p.id=whatsapp_broadcast_recipients.contact_id and p.user_id=(select auth.uid()))));

create policy whatsapp_broadcast_recipients_update_own on public.whatsapp_broadcast_recipients for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (exists(select 1 from public.whatsapp_broadcasts p where p.id=whatsapp_broadcast_recipients.broadcast_id and p.user_id=(select auth.uid()))) and (exists(select 1 from public.crm_contacts p where p.id=whatsapp_broadcast_recipients.contact_id and p.user_id=(select auth.uid()))));

create policy whatsapp_broadcast_recipients_delete_own on public.whatsapp_broadcast_recipients for delete to authenticated using(user_id=(select auth.uid()));

-- Self-referencing reply boundaries use a composite FK, avoiding recursive RLS.
alter table public.whatsapp_messages add constraint whatsapp_messages_reply_owner_conversation_key unique(id,user_id,conversation_id);
alter table public.whatsapp_messages add constraint whatsapp_messages_reply_boundary
  foreign key(reply_to_message_id,user_id,conversation_id)
  references public.whatsapp_messages(id,user_id,conversation_id)
  on delete set null (reply_to_message_id);
-- Owner deletion must remove these personal records, including original contracts without an owner FK.
alter table public.support_inboxes add constraint support_inboxes_owner_fkey foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.support_help_articles add constraint support_help_articles_owner_fkey foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.support_canned_responses add constraint support_canned_responses_owner_fkey foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.whatsapp_conversations add constraint whatsapp_conversations_owner_fkey foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.whatsapp_messages add constraint whatsapp_messages_owner_fkey foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.whatsapp_broadcasts add constraint whatsapp_broadcasts_owner_fkey foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.whatsapp_broadcast_recipients add constraint whatsapp_broadcast_recipients_owner_fkey foreign key(user_id) references auth.users(id) on delete cascade;
create index whatsapp_messages_owner_conversation_idx on public.whatsapp_messages(user_id,conversation_id,created_at);
create index whatsapp_broadcast_recipients_owner_idx on public.whatsapp_broadcast_recipients(user_id,broadcast_id);
notify pgrst,'reload schema';
