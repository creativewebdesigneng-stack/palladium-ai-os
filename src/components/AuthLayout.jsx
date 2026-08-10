import React from "react";
import { Sparkles } from "lucide-react";
import SpaceBackground from "@/components/visual/SpaceBackground";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#090a0f] px-4 text-zinc-100">
      <div aria-hidden className="absolute inset-0 -z-10 opacity-70"><SpaceBackground intensity="low" /></div>
      <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-6 flex items-center justify-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_24px_rgba(139,92,246,.35)]"><Sparkles className="h-4 w-4 text-white" /></span>
            <p className="text-sm font-semibold tracking-tight text-white">Palladium<span className="text-violet-400">AI</span></p>
          </div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 mb-4 shadow-[0_0_30px_rgba(139,92,246,.3)]">
            <Icon className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="text-zinc-500 mt-2">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-8 shadow-2xl backdrop-blur-xl">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}