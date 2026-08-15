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
  // Post-login destination (e.g. the MCP OAuth consent page sends users here
  // with returnTo so the grant flow can resume). Same-origin paths only.
  // Computed after mount so SSR never touches `window`.
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
      // Popup (web_message) flow: the session is already set, so move the user
      // on ourselves. Full-page redirect flows never reach this line.
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
      title="Welcome back"
      subtitle="Continue to your AI operating system"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      {visibleError && (
        <div className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <p>{visibleError}</p>
          {configurationBlocked && (
            <p className="mt-2 text-xs opacity-80">
              Configure the Supabase project/environment variables in the deployment, then reload this page. No credentials are stored in this browser by this setup notice.
            </p>
          )}
        </div>
      )}

      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
        disabled={configurationBlocked}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email or username</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="text"
              autoComplete="username"
              autoFocus
              placeholder="you@example.com or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
              disabled={configurationBlocked}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
              disabled={configurationBlocked}
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || configurationBlocked}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : configurationBlocked ? (
            "Supabase setup required"
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
