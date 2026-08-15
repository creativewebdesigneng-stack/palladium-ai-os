import React, { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from '@/lib/auth/client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const { authError } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const visibleError = error || authError || "";
  const configurationBlocked = visibleError.includes("Supabase is not configured for this deployment");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (configurationBlocked) return;
    setError("");
    setLoading(true);
    try {
      await auth.resetPasswordRequest(email);
      setSent(true);
    } catch (err) {
      const message = err?.message || "";
      if (message.includes("Supabase is not configured for this deployment")) {
        setError(message);
        setSent(false);
      } else {
        // Preserve anti-enumeration behavior for normal auth failures: callers
        // should not be able to learn whether an account exists from this UI.
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Reset password"
      subtitle="We'll send you a link to reset it"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to log in
        </Link>
      }
    >
      {visibleError && configurationBlocked && (
        <div className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <p>{visibleError}</p>
          <p className="mt-2 text-xs opacity-80">
            Configure the Supabase project/environment variables in the deployment, then reload this page before requesting a password reset.
          </p>
        </div>
      )}

      {sent ? (
        <p className="text-sm text-foreground text-center">
          If an account exists with that email, you'll receive a password reset link shortly.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                Sending...
              </>
            ) : configurationBlocked ? (
              "Supabase setup required"
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
