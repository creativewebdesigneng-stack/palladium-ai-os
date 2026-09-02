import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth } from '@/lib/auth/client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const { authError, checkUserAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  useEffect(() => {
    setReturnTo(safeReturnTo());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      const result = await auth.loginWithProvider("google", returnTo);
      if (result && !result.redirected) {
        await checkUserAuth();
        window.location.href = returnTo;
      }
    } catch (err) {
      setError(err?.message || "Google sign-in could not start.");
    }
  };

  const visibleError = error || authError || "";
  const configurationBlocked = visibleError.includes("Supabase is not configured for this deployment");

  return (
    <AuthLayout
      icon={LogIn}
      title="Enter Blackstar"
      subtitle="Authenticate to access your intelligence infrastructure, agents, workflows and operational command surfaces."
      footer={
        <>
          New to Blackstar?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="font-medium text-violet-300 hover:text-violet-200 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      {visibleError && (
        <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-500/[.06] p-3 text-sm text-rose-200">
          <p>{visibleError}</p>
          {configurationBlocked && (
            <p className="mt-2 text-xs text-rose-200/70">
              Configure the Supabase project/environment variables in the deployment, then reload this page. No credentials are stored in this browser by this setup notice.
            </p>
          )}
        </div>
      )}

      <Button
        variant="outline"
        className="mb-6 h-12 w-full border-white/10 bg-white/[.025] text-sm font-medium text-white hover:bg-white/[.06]"
        onClick={handleGoogle}
        disabled={configurationBlocked}
      >
        <GoogleIcon className="mr-2 h-5 w-5" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/8" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-[.22em]">
          <span className="bg-[#08080b] px-3 text-white/30">or use credentials</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs text-white/55">Email or username</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" aria-hidden="true" />
            <Input
              id="email"
              type="text"
              autoComplete="username"
              autoFocus
              placeholder="you@example.com or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 border-white/10 bg-black/35 pl-10 text-white placeholder:text-white/20 focus-visible:ring-violet-400/30"
              required
              disabled={configurationBlocked}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs text-white/55">Password</Label>
            <Link to="/forgot-password" className="text-xs text-violet-300/80 hover:text-violet-200">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 border-white/10 bg-black/35 pl-10 text-white placeholder:text-white/20 focus-visible:ring-violet-400/30"
              required
              disabled={configurationBlocked}
            />
          </div>
        </div>
        <Button type="submit" className="h-12 w-full bg-white font-medium text-black hover:bg-zinc-200" disabled={loading || configurationBlocked}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : configurationBlocked ? (
            "Supabase setup required"
          ) : (
            "Enter Blackstar"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
