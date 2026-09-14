export type BackendField={name?:string;type?:string;required?:boolean};
export type BackendCollection={name?:string;fields?:BackendField[]};
export type WebsiteAppConfig={collections?:BackendCollection[];forms?:unknown[];auth?:{enabled?:boolean;providers?:string[]}};

const TYPE_MAP:Record<string,string>={
  text:'text',
  string:'text',
  uuid:'uuid',
  timestamp:'timestamptz',
  datetime:'timestamptz',
  date:'date',
  boolean:'boolean',
  integer:'bigint',
  number:'numeric',
  decimal:'numeric',
  json:'jsonb',
  jsonb:'jsonb',
};

export function safeSqlIdentifier(value:string):string{
  const cleaned=String(value||'').trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_');
  return cleaned&&/^[a-z_]/.test(cleaned)?cleaned:`item_${cleaned||'collection'}`;
}

export function compileWebsiteBackendSql(config:WebsiteAppConfig):{sql:string;warnings:string[]}{
  const collections=Array.isArray(config.collections)?config.collections:[];
  const warnings:string[]=[];
  if(config.auth?.enabled) warnings.push('Authentication providers are requested but require deployment credentials and callback configuration; this SQL does not activate OAuth or email delivery.');
  if(Array.isArray(config.forms)&&config.forms.length) warnings.push('Forms are defined, but form actions still require generated server handlers or a backend adapter.');

  const blocks=collections.map((collection,index)=>{
    const table=safeSqlIdentifier(collection.name||`collection_${index+1}`);
    const userFields=(Array.isArray(collection.fields)?collection.fields:[])
      .filter(field=>!['id','user_id','created_at','updated_at'].includes(safeSqlIdentifier(field.name||'')))
      .map(field=>{
        const name=safeSqlIdentifier(field.name||'field');
        const type=TYPE_MAP[String(field.type||'text').toLowerCase()]||'text';
        return `  ${name} ${type}${field.required?' not null':''}`;
      });

    return `create table if not exists public.${table} (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
${userFields.length?userFields.join(',\n')+',\n':''}  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ${table}_user_updated_idx
  on public.${table}(user_id, updated_at desc);

alter table public.${table} enable row level security;

drop policy if exists "${table} select own" on public.${table};
drop policy if exists "${table} insert own" on public.${table};
drop policy if exists "${table} update own" on public.${table};
drop policy if exists "${table} delete own" on public.${table};

create policy "${table} select own" on public.${table}
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "${table} insert own" on public.${table}
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "${table} update own" on public.${table}
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "${table} delete own" on public.${table}
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.${table} from anon;
grant select, insert, update, delete on public.${table} to authenticated;`;
  });

  return {
    sql:blocks.join('\n\n'),
    warnings,
  };
}
