import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth/client';
import { safeReturnTo } from '@/lib/authReturnTo';

export default function EmailVerification() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
  }, []);

  const verify = async (e) => {
    e.preventDefault();
    if (!email || code.length < 6) return;
    setError('');
    setLoading(true);
    try {
      await auth.verifyOtp({ email, otpCode: code });
      window.location.href = safeReturnTo();
    } catch (err) {
      setError(err?.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) {
      setError('Return to registration and enter your email address first.');
      return;
    }
    setError('');
    try {
      await auth.resendOtp(email);
    } catch (err) {
      setError(err?.message || 'Could not resend the verification email');
    }
  };

  return (
    <AuthLayout
      icon={MailCheck}
      title="Verify your email"
      subtitle={email ? `Complete verification for ${email}` : 'Complete Blackstar email verification'}
      footer={<>Need another message? <button onClick={resend} className="text-primary font-medium hover:underline">Resend verification email</button></>}
    >
      {error && <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="mb-6 rounded-2xl border border-violet-300/10 bg-violet-300/[.035] p-4 text-sm leading-6 text-zinc-400">
        If your Blackstar email contains a confirmation link, click that link to verify your address. If it contains a 6-digit code, enter the code below.
      </div>

      <form onSubmit={verify} className="space-y-6">
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode} autoComplete="one-time-code">
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
        <Button type="submit" className="h-12 w-full font-medium" disabled={loading || !email || code.length < 6}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : 'Verify code & continue'}
        </Button>
      </form>

      {!email && (
        <p className="mt-4 text-center text-xs text-amber-300/80">
          No email address was supplied to this page. Use the confirmation link from your email or return to registration.
        </p>
      )}

      <p className="mt-6 text-center text-xs text-zinc-600">
        <Link to="/login" className="hover:text-white">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
