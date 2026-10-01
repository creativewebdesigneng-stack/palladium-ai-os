import React from "react";
import BlackstarExperienceField from "@/components/blackstar/BlackstarExperienceField";
import { AstraWordmark } from "@/components/blackstar/AstraMark";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="blackstar-auth-space blackstar-style-orbital-elegance relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#010103] px-4 py-10 text-zinc-100">
      <div className="fixed inset-0 z-0">
        <BlackstarExperienceField room="astra-room-core" visualStyle="blackstar-style-orbital-elegance" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_0%,rgba(226,232,240,.055),transparent_34%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,.62)_100%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-7 flex items-center justify-center">
            <AstraWordmark />
          </div>

          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-violet-300/15 bg-violet-300/[.06] shadow-[0_0_38px_rgba(123,92,255,.12)]">
            <Icon className="h-5 w-5 text-violet-200" aria-hidden="true" />
          </div>
          <p className="astra-room-label mb-2 text-zinc-500">Secure intelligence access</p>
          <h1 className="text-3xl font-semibold tracking-[-.04em] text-white">{title}</h1>
          {subtitle && <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/45">{subtitle}</p>}
        </div>

        <div className="blackstar-auth-card relative overflow-hidden rounded-[26px] border border-white/[.09] p-7 backdrop-blur-2xl sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/45 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute right-[-5rem] top-[-5rem] h-40 w-40 rounded-full bg-violet-500/10 blur-[70px]" />
          <div className="relative">{children}</div>
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-white/40">{footer}</p>
        )}
        <p className="mt-5 text-center text-[9px] font-medium uppercase tracking-[.24em] text-white/20">Protected Blackstar identity boundary</p>
      </div>
    </div>
  );
}
