import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — PalladiumAI" },
      { name: "description", content: "Request a secure reset link for your PalladiumAI operator account." },
      { property: "og:title", content: "Reset password — PalladiumAI" },
      { property: "og:description", content: "Request a secure reset link." },
    ],
  }),
  component: () => (
    <AuthLayout title="Reset access" subtitle="We'll send a secure link to your operator email." footer={<Link to="/login" className="text-primary hover:underline">Back to sign in</Link>}>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Email</Label><Input type="email" placeholder="you@company.com" /></div>
      <Button variant="hero" size="lg" className="w-full">Send reset link</Button>
    </AuthLayout>
  ),
});
