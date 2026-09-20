import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const migration=readFileSync(
  new URL("../../../supabase/migrations/20260920195000_private_knowledge_memory_bucket.sql",import.meta.url),
  "utf8",
);

describe("Blackstar private knowledge storage",()=>{
  it("provisions only a private, bounded knowledge bucket",()=>{
    expect(migration).toContain("values ('knowledge','knowledge',false,26214400)");
    expect(migration).toContain("public is distinct from false");
    expect(migration).not.toContain("public,true");
  });

  it("requires authenticated owner path for all four storage operations",()=>{
    for(const operation of ["read","insert","update","delete"]){
      expect(migration).toContain(`blackstar_knowledge_owner_${operation}`);
    }
    expect((migration.match(/bucket_id='knowledge'/g)??[]).length).toBeGreaterThanOrEqual(5);
    expect((migration.match(/storage\.foldername\(name\)\)\[1\]=\(select auth\.uid\(\)\)::text/g)??[]).length).toBeGreaterThanOrEqual(5);
    expect(migration).toContain("for select to authenticated");
    expect(migration).toContain("for insert to authenticated");
    expect(migration).toContain("for update to authenticated");
    expect(migration).toContain("for delete to authenticated");
  });

  it("does not create public file access or grant access to unrelated buckets",()=>{
    expect(migration).not.toContain("to anon");
    expect(migration).not.toContain("grant all on storage.objects");
    expect(migration).not.toContain("using (true)");
  });
});
