import React, { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from '@/lib/auth/client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  const { authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const visibleError = error || authError || "";
  const configurationBlocked = visibleError.includes("Supabase is not configured for this deployment");

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); if (configurationBlocked) return;
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try { await auth.register({ email, password }); setShowOtp(true); }
    catch (err) { setError(err.message || "Registration failed"); }
    finally { setLoading(false); }
  };
  const handleVerify = async () => {
    setError(""); if (configurationBlocked) return; setLoading(true);
    try { const result = await auth.verifyOtp({ email, otpCode }); if (result?.access_token) auth.setToken(result.access_token); window.location.href = safeReturnTo(); }
    catch (err) { setError(err.message || "Invalid verification code"); }
    finally { setLoading(false); }
  };
  const handleResend = async () => {
    setError(""); if (configurationBlocked) return;
    try { await auth.resendOtp(email); toast({ title: "Code sent", description: "Check your email for the new Blackstar verification code." }); }
    catch (err) { setError(err.message || "Failed to resend code"); }
  };
  const handleGoogle = async () => {
    try { if (configurationBlocked) return; const target = safeReturnTo(); const result = await auth.loginWithProvider("google", target); if (result && !result.redirected) window.location.href = target; }
    catch (err) { setError(err?.message || "Google sign-up could not start."); }
  };

  const fieldClass = "h-12 border-violet-300/10 bg-black/30 pl-10 text-white placeholder:text-zinc-600 focus-visible:ring-violet-300/20";
  if (showOtp) return (
    <AuthLayout icon={Mail} title="Verify Blackstar access" subtitle={`A secure verification code was sent to ${email}`}>
      {visibleError && <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{visibleError}</div>}
      <div className="mb-6 flex justify-center"><InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code"><InputOTPGroup>{[0,1,2,3,4,5].map((i)=><InputOTPSlot key={i} index={i} />)}</InputOTPGroup></InputOTP></div>
      <Button className="h-12 w-full bg-violet-300 font-semibold text-[#09070d] hover:bg-violet-200" onClick={handleVerify} disabled={loading || otpCode.length < 6 || configurationBlocked}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying access…</> : "Verify access"}</Button>
      <p className="mt-4 text-center text-sm text-muted-foreground">Didn't receive the code? <button onClick={handleResend} disabled={configurationBlocked} className="font-medium text-violet-300 hover:text-violet-200 disabled:opacity-50">Resend</button></p>
    </AuthLayout>
  );

  return (
    <AuthLayout icon={UserPlus} title="Create Blackstar access" subtitle="Enter the intelligence infrastructure." footer={<>Already have access? <Link to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")} className="font-medium text-violet-300 hover:text-violet-200">Sign in</Link></>}>
      {visibleError && <div className="mb-5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"><p>{visibleError}</p>{configurationBlocked && <p className="mt-2 text-xs opacity-80">Configure the Supabase project/environment variables in the deployment, then reload this page before creating accounts.</p>}</div>}
      <Button variant="outline" className="mb-6 h-12 w-full border-violet-300/10 bg-black/25 text-sm font-medium hover:bg-violet-400/[.05]" onClick={handleGoogle} disabled={configurationBlocked}><GoogleIcon className="mr-2 h-5 w-5" />Continue with Google</Button>
      <div className="relative mb-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-violet-300/10" /></div><div className="relative flex justify-center text-[10px] uppercase tracking-[.2em]"><span className="bg-card px-3 text-muted-foreground">or secure email</span></div></div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/60" /><Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} className={fieldClass} required disabled={configurationBlocked} /></div></div>
        <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/60" /><Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} className={fieldClass} required disabled={configurationBlocked} /></div></div>
        <div className="space-y-2"><Label htmlFor="confirm">Confirm password</Label><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/60" /><Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} className={fieldClass} required disabled={configurationBlocked} /></div></div>
        <Button type="submit" className="h-12 w-full bg-violet-300 font-semibold text-[#09070d] hover:bg-violet-200" disabled={loading || configurationBlocked}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating secure access…</> : configurationBlocked ? "Supabase setup required" : "Create Blackstar access"}</Button>
      </form>
    </AuthLayout>
  );
}
