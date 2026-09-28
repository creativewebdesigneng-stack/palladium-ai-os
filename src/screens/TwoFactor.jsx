import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function TwoFactor(){
  return <AuthLayout
    icon={ShieldCheck}
    title="Two-factor authentication"
    subtitle="Complete the additional authentication step to continue into Blackstar."
    footer={<Link to="/login" className="font-medium text-violet-300 hover:text-violet-200 hover:underline">Return to sign in</Link>}
  >
    <p className="text-center text-sm text-zinc-500">Enter the six-digit code from your authenticator app.</p>
    <div className="mt-6 flex justify-center gap-2">{[0,1,2,3,4,5].map(i=><input key={i} maxLength="1" inputMode="numeric" aria-label={`Authentication code digit ${i+1}`} className="h-12 w-10 rounded-lg border border-white/10 bg-black/25 text-center text-white outline-none focus:border-violet-400/60"/>)}</div>
    <Link to="/onboarding" className="mt-6 block rounded-xl bg-white py-3 text-center text-sm font-medium text-black transition hover:bg-zinc-200">Verify and continue</Link>
    <button className="mt-4 w-full text-xs text-zinc-500 hover:text-zinc-300">Use a recovery code</button>
  </AuthLayout>;
}
