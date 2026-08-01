import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — PalladiumAI" },
      { name: "description", content: "Create your PalladiumAI account and provision your first AI departments in minutes." },
      { property: "og:title", content: "Create account — PalladiumAI" },
      { property: "og:description", content: "Provision your AI workforce in minutes." },
    ],
  }),
  component: () => (
    <AuthLayout title="Provision your workforce" subtitle="Start with an AI CEO and three departments, free for 14 days." footer={<>Already an operator? <Link to="/login" className="text-primary hover:underline">Sign in</Link></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">First name</Label><Input placeholder="James" /></div>
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Last name</Label><Input placeholder="Morrow" /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Work email</Label><Input type="email" placeholder="you@company.com" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Password</Label><Input type="password" placeholder="At least 12 characters" /></div>
      <Button asChild variant="hero" size="lg" className="w-full"><Link to="/verify-email">Create account</Link></Button>
      <p className="text-[11px] text-muted-foreground">By continuing you agree to the operator terms and privacy policy.</p>
    </AuthLayout>
  ),
});
