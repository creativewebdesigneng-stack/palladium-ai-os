import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Blackstar registration verification flow", () => {
  const register = readFileSync(new URL("../../screens/Register.jsx", import.meta.url), "utf8");
  const verify = readFileSync(new URL("../../screens/EmailVerification.jsx", import.meta.url), "utf8");
  const auth = readFileSync(new URL("../auth/client.js", import.meta.url), "utf8");

  it("does not claim that every signup email contains a six-digit code", () => {
    expect(register).toContain("click the confirmation link");
    expect(register).toContain("I have a 6-digit code");
    expect(register).not.toContain("A secure verification code was sent");
    expect(register).not.toContain('title: "Code sent"');
  });

  it("keeps six-digit OTP support available when the Supabase template uses Token", () => {
    expect(register).toContain("await auth.verifyOtp({ email, otpCode })");
    expect(register).toContain('autoComplete="one-time-code"');
    expect(auth).toContain("supabase.auth.verifyOtp");
    expect(auth).toContain("token: otpCode ?? otp");
  });

  it("allows confirmation-link users to continue only when Supabase has a session", () => {
    expect(register).toContain("await auth.isAuthenticated()");
    expect(register).toContain("I've verified my email");
    expect(register).toContain("Your email is not verified in this browser yet");
  });

  it("uses real verification on the standalone page instead of a fake timer", () => {
    expect(verify).toContain("await auth.verifyOtp");
    expect(verify).toContain("await auth.resendOtp(email)");
    expect(verify).not.toContain("setTimeout(");
    expect(verify).toContain("If your Blackstar email contains a confirmation link");
  });

  it("retains Supabase signup confirmation redirect handling", () => {
    expect(auth).toContain("supabase.auth.signUp");
    expect(auth).toContain("emailRedirectTo:");
    expect(auth).toContain("window.location.origin}/dashboard");
  });
});
