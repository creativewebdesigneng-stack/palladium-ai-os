import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-0 size-[520px] animate-aurora rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute -right-24 bottom-0 size-[480px] animate-aurora rounded-full bg-accent/15 blur-[140px] [animation-delay:-8s]" />
      </div>
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center"><BrandLogo /></Link>
        <div className="panel animate-rise p-7 sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-7 space-y-4">{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-xs text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}
