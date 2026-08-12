/**
 * Auth client for PalladiumAI screens.
 *
 * A thin, typed-by-convention wrapper over the Lovable Cloud auth client plus
 * the caller's profile row. This replaces the old hosted-SDK auth surface —
 * identity now comes from the Cloud session only, never from local storage.
 */
import { supabase } from "@/integrations/supabase/client";

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

/** The signed-in user enriched with their profile row, or null. */
export async function currentUser() {
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

export const auth = {
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
        emailRedirectTo:
          typeof window === "undefined" ? undefined : `${window.location.origin}/dashboard`,
        data: full_name ? { full_name } : undefined,
      },
    });
    if (error) throw error;
    return data;
  },
  async verifyOtp({ email, otpCode, otp, type = "email" } = {}) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode ?? otp,
      type,
    });
    if (error) throw error;
    return data;
  },
  async resendOtp(email) {
    const address = typeof email === "string" ? email : email?.email;
    const { error } = await supabase.auth.resend({ type: "signup", email: address });
    if (error) throw error;
    return true;
  },
  async loginWithProvider(provider, returnTo) {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: origin
          ? `${origin}${returnTo && returnTo.startsWith("/") ? returnTo : ""}`
          : undefined,
      },
    });
    if (error) throw error;
    return data;
  },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  },
  async resetPassword({ newPassword, password } = {}) {
    const { error } = await supabase.auth.updateUser({ password: newPassword ?? password });
    if (error) throw error;
    return true;
  },
  /** Sessions are managed by the Cloud client; kept for call-site compatibility. */
  async setToken() {
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

/** Uploads a file to the `uploads` bucket and returns its public URL. */
export async function uploadFile({ file } = {}) {
  const path = `${Date.now()}-${file?.name ?? "file"}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return { file_url: data.publicUrl, url: data.publicUrl, path };
}

export default auth;
