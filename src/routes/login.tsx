import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — PalladiumAI" },
      { name: "description", content: "Sign in to PalladiumAI and take command of your AI workforce." },
      { property: "og:title", content: "Sign in — PalladiumAI" },
      { property: "og:description", content: "Take command of your AI workforce." },
    ],
  }),
  component: () => (
    <AuthLayout title="Welcome back, operator" subtitle="Sign in to resume command of your workforce." footer={<>New here? <Link to="/register" className="text-primary hover:underline">Create an account</Link></>}>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Email</Label><Input type="email" placeholder="you@company.com" /></div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Password</Label><Link to="/forgot-password" className="text-[11px] text-primary hover:underline">Forgot?</Link></div>
        <Input type="password" placeholder="••••••••" />
      </div>
      <Button asChild variant="hero" size="lg" className="w-full"><Link to="/app">Enter the OS</Link></Button>
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <Button variant="glass" size="lg" className="w-full">Continue with Google</Button>
    </AuthLayout>
  ),
});
