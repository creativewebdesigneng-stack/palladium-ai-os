/**
 * Backend client for PalladiumAI.
 *
 * The screens were originally written against a hosted SDK (`base44`). This
 * module keeps that call surface but implements it on top of Lovable Cloud
 * (auth, database, storage) so the app runs on our own backend.
 *
 * - `base44.auth.*`      -> Cloud auth
 * - `base44.entities.X`  -> table `x` (snake_case, pluralised) via the Data API
 * - `base44.integrations.Core.UploadFile` -> Cloud storage bucket `uploads`
 * - `base44.functions.invoke` -> server functions (not yet wired: resolves null)
 */
import { supabase } from "@/integrations/supabase/client";

const toTable = (entity) =>
  entity
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/y$/, "ie")
    .concat("s")
    .replace(/ss$/, "s");

const mapUser = (user, profile) =>
  user
    ? {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name ?? user.user_metadata?.full_name ?? "",
        avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? "",
        role: profile?.role ?? "user",
        created_at: user.created_at,
        ...profile,
      }
    : null;

async function currentUser() {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return null;
  let profile = null;
  try {
    const res = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    profile = res.data;
  } catch {
    profile = null;
  }
  return mapUser(data.user, profile);
}

const auth = {
  me: currentUser,
  getUser: currentUser,
  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return Boolean(data?.session);
  },
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async register({ email, password, full_name } = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/dashboard`,
        data: full_name ? { full_name } : undefined,
      },
    });
    if (error) throw error;
    return data;
  },
  async verifyOtp({ email, otp, type = "email" } = {}) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type });
    if (error) throw error;
    return data;
  },
  async resendOtp({ email } = {}) {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw error;
    return true;
  },
  async loginWithProvider(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window === "undefined" ? undefined : window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  },
  async resetPassword({ password } = {}) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return true;
  },
  async setToken() {
    /* sessions are managed by the Cloud client */
    return true;
  },
  async logout() {
    await supabase.auth.signOut();
    return true;
  },
  onAuthStateChange(cb) {
    return supabase.auth.onAuthStateChange((_event, session) => cb(session));
  },
};

function entity(name) {
  const table = toTable(name);
  const query = () => supabase.from(table);
  const rows = async (builder) => {
    const { data, error } = await builder;
    if (error) {
      console.warn(`[data] ${table}:`, error.message);
      return [];
    }
    return data ?? [];
  };
  return {
    table,
    list: (sort, limit) => {
      let q = query().select("*");
      if (sort) q = q.order(sort.replace(/^-/, ""), { ascending: !sort.startsWith("-") });
      if (limit) q = q.limit(limit);
      return rows(q);
    },
    filter: (where = {}, sort, limit) => {
      let q = query().select("*");
      for (const [key, value] of Object.entries(where)) {
        if (value === undefined || value === null) continue;
        q = Array.isArray(value) ? q.in(key, value) : q.eq(key, value);
      }
      if (sort) q = q.order(sort.replace(/^-/, ""), { ascending: !sort.startsWith("-") });
      if (limit) q = q.limit(limit);
      return rows(q);
    },
    async get(id) {
      const { data, error } = await query().select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async create(values) {
      const { data, error } = await query().insert(values).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    async update(id, values) {
      const { data, error } = await query().update(values).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      const { error } = await query().delete().eq("id", id);
      if (error) throw error;
      return true;
    },
  };
}

const entities = new Proxy(
  {},
  {
    get: (cache, name) => {
      if (typeof name !== "string") return undefined;
      if (!cache[name]) cache[name] = entity(name);
      return cache[name];
    },
  },
);

const integrations = {
  Core: {
    async UploadFile({ file } = {}) {
      const path = `${Date.now()}-${file?.name ?? "file"}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      return { file_url: data.publicUrl, url: data.publicUrl, path };
    },
  },
};

const functions = {
  async invoke(name, payload) {
    console.info(`[functions] ${name} not implemented yet`, payload);
    return { data: null, error: null };
  },
};

export const base44 = { auth, entities, integrations, functions };
export default base44;
