import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function TwoFactor() {
  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Two-factor authentication"
      subtitle="This Blackstar screen is not connected to a standalone MFA verifier on this deployment."
      footer={
        <Link to="/login" className="font-medium text-violet-300 hover:text-violet-200 hover:underline">
          Return to sign in
        </Link>
      }
    >
      <div
        role="status"
        className="rounded-xl border border-amber-300/15 bg-amber-300/[.045] p-4 text-sm leading-6 text-amber-100/80"
      >
        Blackstar will not accept or pretend to verify authenticator or recovery codes here. If a connected identity provider requires a second factor, complete that challenge in the provider-authenticated flow.
      </div>
    </AuthLayout>
  );
}
