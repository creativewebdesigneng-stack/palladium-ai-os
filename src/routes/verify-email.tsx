import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify email — PalladiumAI" },
      { name: "description", content: "Confirm your email to finish provisioning your PalladiumAI workforce." },
      { property: "og:title", content: "Verify email — PalladiumAI" },
      { property: "og:description", content: "Confirm your email to finish provisioning." },
    ],
  }),
  component: () => (
    <AuthLayout title="Check your inbox" subtitle="We sent a six-digit code to you@company.com to verify your account." footer={<>Wrong address? <Link to="/register" className="text-primary hover:underline">Start again</Link></>}>
      <div className="glass flex items-center gap-3 rounded-xl p-4">
        <MailCheck className="size-5 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">Verification unlocks your AI CEO and the first three departments.</p>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <input key={i} maxLength={1} className="glass h-12 w-full rounded-xl text-center font-display text-lg outline-none focus:border-primary/60" />
        ))}
      </div>
      <Button asChild variant="hero" size="lg" className="w-full"><Link to="/onboarding">Verify and continue</Link></Button>
    </AuthLayout>
  ),
});
