import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';

export default function EmailVerification() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || 'your email';

  const verify = (e) => {
    e.preventDefault();
    if (code.length < 6) return;
    setLoading(true);
    setTimeout(() => { navigate('/pricing'); }, 800);
  };

  return (
    <AuthLayout
      icon={MailCheck}
      title="Verify your email"
      subtitle={`We sent a 6-digit code to ${email}`}
      footer={<>Didn’t get a code? <button className="text-primary font-medium hover:underline">Resend</button></>}
    >
      <form onSubmit={verify} className="space-y-6">
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button type="submit" className="h-12 w-full font-medium" disabled={loading || code.length < 6}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : 'Verify & continue'}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-zinc-600">
        <Link to="/login" className="hover:text-white">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}