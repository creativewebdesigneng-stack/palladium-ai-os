import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from '@/lib/auth/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [recoverySessionReady, setRecoverySessionReady] = useState(false);

  useEffect(() => {
    let active = true;

    const markSession = (session) => {
      if (!active) return;
      if (session) {
        setRecoverySessionReady(true);
        setError("");
      }
      setCheckingSession(false);
    };

    auth.getSession()
      .then(markSession)
      .catch(() => {
        if (!active) return;
        setRecoverySessionReady(false);
        setCheckingSession(false);
      });

    const listener = auth.onAuthStateChange((session) => markSession(session));

    return () => {
      active = false;
      listener?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!recoverySessionReady) {
      setError("This password reset session is missing or has expired. Request a new reset email.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword({ newPassword });
      await auth.logout();
      window.location.href = "/login";
    } catch (err) {
      setError(err?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <AuthLayout
        icon={Lock}
        title="Secure password reset"
        subtitle="Checking the recovery session from your Blackstar reset link"
      >
        <div role="status" className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying recovery session…
        </div>
      </AuthLayout>
    );
  }

  if (!recoverySessionReady) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Invalid or expired reset session"
        subtitle="Open the latest Blackstar password reset link from your email"
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Request a new reset link
          </Link>
        }
      >
        <p className="text-center text-sm text-foreground">
          No active Supabase recovery session was found in this browser. Request a new password reset email and open its link here.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="New password"
      subtitle="Enter your new password below"
    >
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-12 pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 pl-10"
              required
            />
          </div>
        </div>
        <Button type="submit" className="h-12 w-full font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
