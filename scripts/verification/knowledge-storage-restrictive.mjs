// Isolated knowledge-bucket checks. Never contacts production storage.
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const name = readdirSync("supabase/migrations").find((entry) =>
  entry.endsWith("_knowledge_storage_restrictive_owner.sql"),
);
if (!name) throw new Error("Knowledge storage migration is missing");
const migration = readFileSync(`supabase/migrations/${name}`, "utf8");

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1);
const other = id(2);
const org = id(11);
const ownObject = id(31);
const otherBucket = id(32);

const db = new PGlite();
let passed = 0;
const check = (value, message) => {
  assert.ok(value, message);
  passed += 1;
};
const rows = async (query, params) => (await db.query(query, params)).rows;
const denied = async (query, params) => {
  await assert.rejects(() => db.query(query, params));
  passed += 1;
};

await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;
  create schema private;
  create schema storage;
  create table auth.users(id uuid primary key);
  create table organisation_members(org_id uuid, user_id uuid, role text);
  create table public.memory_documents(
    id uuid primary key,
    user_id uuid not null,
    org_id uuid,
    storage_path text,
    title text not null
  );
  create table storage.objects(
    id uuid primary key,
    bucket_id text not null,
    name text not null,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create function private.is_org_member(_org uuid) returns boolean
    language sql stable security definer set search_path = '' as $$
    select exists(
      select 1 from public.organisation_members
      where user_id = auth.uid() and org_id = _org
    )
  $$;
  grant usage on schema public, auth, storage, private to anon, authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  alter table storage.objects enable row level security;
  create policy broad_non_media on storage.objects
    for select to authenticated using (bucket_id <> 'trusted-media');
  create policy knowledge_owner_prefix on storage.objects
    for select to authenticated
    using (bucket_id = 'knowledge' and split_part(name, '/', 1) = (select auth.uid())::text);
  create policy broad_insert on storage.objects
    for insert to authenticated with check (true);
  insert into auth.users values ('${owner}'), ('${other}');
  insert into organisation_members values ('${org}', '${owner}', 'owner');
`);

await db.exec(migration);
await db.exec(migration);

await db.query(
  `insert into storage.objects(id, bucket_id, name) values ($1, 'knowledge', $2), ($3, 'cinema-hf-outputs', $4)`,
  [ownObject, `${owner}/notes.txt`, otherBucket, `${other}/clip.mp4`],
);

await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`);
check(
  (await rows("select id from storage.objects where bucket_id = 'knowledge'")).length === 1,
  "uploader can read a fresh unindexed knowledge object",
);
check(
  (await rows("select id from storage.objects where bucket_id = 'cinema-hf-outputs'")).length === 1,
  "another bucket stays readable",
);

await db.exec(`set request.jwt.claim.sub = '${other}';`);
check(
  (await rows("select id from storage.objects where bucket_id = 'knowledge'")).length === 0,
  "a broad permissive policy cannot reveal another user's knowledge object",
);
check(
  (await rows("select id from storage.objects where bucket_id = 'cinema-hf-outputs'")).length === 1,
  "the restriction does not hide other buckets",
);
await denied(`insert into storage.objects(id, bucket_id, name) values ($1, 'knowledge', $2)`, [
  id(41),
  `${owner}/stolen.txt`,
]);

await db.exec(`reset role;`);
await db.query(`update storage.objects set created_at = now() - interval '2 hours' where id = $1`, [
  ownObject,
]);
await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`);
check(
  (await rows("select id from storage.objects where bucket_id = 'knowledge'")).length === 0,
  "an unindexed knowledge object expires after one hour",
);

await db.exec(`reset role;`);
await db.query(
  `insert into memory_documents(id, user_id, org_id, storage_path, title) values ($1, $2, $3, $4, 'Notes')`,
  [id(51), owner, org, `${owner}/notes.txt`],
);
await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`);
check(
  (await rows("select id from storage.objects where bucket_id = 'knowledge'")).length === 1,
  "current organisation member can read a linked knowledge object",
);
await db.exec(`reset role; delete from organisation_members where user_id = '${owner}';`);
await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`);
check(
  (await rows("select id from storage.objects where bucket_id = 'knowledge'")).length === 0,
  "offboarded uploader cannot keep reading the organisation file",
);

await db.exec("reset role; set role anon;");
await denied("select * from storage.objects");

await db.close();
console.log(`Knowledge storage: ${passed} isolated checks passed.`);
