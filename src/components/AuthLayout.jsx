import React from "react";
import SpaceBackground from "@/components/visual/SpaceBackground";

function BlackstarMark() {
  return (
    <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/60 shadow-[0_0_36px_rgba(139,92,246,.2)]">
      <span className="absolute h-5 w-5 rotate-45 rounded-[3px] border border-violet-200/65" />
      <span className="h-2 w-2 rounded-full bg-violet-200 shadow-[0_0_18px_rgba(196,181,253,.9)]" />
    </span>
  );
}

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-4 py-10 text-zinc-100">
      <div aria-hidden className="absolute inset-0 -z-10 opacity-55"><SpaceBackground intensity="low" /></div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.13),transparent_38%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,.36)_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-35 bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-7 flex items-center justify-center gap-3">
            <BlackstarMark />
            <div className="text-left">
              <p className="text-sm font-semibold tracking-[.18em] text-white">BLACKSTAR</p>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[.24em] text-white/35">Intelligence Infrastructure</p>
            </div>
          </div>

          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-violet-300/15 bg-violet-300/[.06] shadow-[0_0_38px_rgba(139,92,246,.12)]">
            <Icon className="h-5 w-5 text-violet-200" aria-hidden="true" />
          </div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.3em] text-violet-300/65">Secure Access Node</p>
          <h1 className="text-3xl font-semibold tracking-[-.04em] text-white">{title}</h1>
          {subtitle && <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/45">{subtitle}</p>}
        </div>

        <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-black/45 p-7 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl sm:p-8">
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
