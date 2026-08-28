import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type BrowserCredentialTable = {
  Row: {
    id: string;
    user_id: string;
    org_id: string | null;
    name: string;
    domain: string;
    username_ciphertext: string | null;
    password_ciphertext: string | null;
    totp_secret_ciphertext: string | null;
    totp_identifier: string | null;
    created_at: string;
    updated_at: string;
    last_used_at: string | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    org_id?: string | null;
    name: string;
    domain: string;
    username_ciphertext?: string | null;
    password_ciphertext?: string | null;
    totp_secret_ciphertext?: string | null;
    totp_identifier?: string | null;
    created_at?: string;
    updated_at?: string;
    last_used_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    org_id?: string | null;
    name?: string;
    domain?: string;
    username_ciphertext?: string | null;
    password_ciphertext?: string | null;
    totp_secret_ciphertext?: string | null;
    totp_identifier?: string | null;
    created_at?: string;
    updated_at?: string;
    last_used_at?: string | null;
  };
  Relationships: [];
};

type BrowserArtifactTable = {
  Row: {
    id: string;
    user_id: string;
    org_id: string | null;
    agent_id: string | null;
    task_id: string | null;
    kind: string;
    filename: string;
    mime_type: string | null;
    size_bytes: number;
    sha256: string;
    storage_path: string;
    source_url: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    org_id?: string | null;
    agent_id?: string | null;
    task_id?: string | null;
    kind?: string;
    filename: string;
    mime_type?: string | null;
    size_bytes: number;
    sha256: string;
    storage_path: string;
    source_url?: string | null;
    created_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    org_id?: string | null;
    agent_id?: string | null;
    task_id?: string | null;
    kind?: string;
    filename?: string;
    mime_type?: string | null;
    size_bytes?: number;
    sha256?: string;
    storage_path?: string;
    source_url?: string | null;
    created_at?: string;
  };
  Relationships: [];
};

export type BrowserDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      browser_credentials: BrowserCredentialTable;
      browser_artifacts: BrowserArtifactTable;
    };
  };
};

export function asBrowserDatabase(client: unknown): SupabaseClient<BrowserDatabase> {
  return client as SupabaseClient<BrowserDatabase>;
}
