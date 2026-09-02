const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-rose-400/20 bg-rose-500/[.07] px-4 py-2 text-center text-xs text-rose-200">
        Blackstar production checkout is not configured yet. Complete the payments go-live configuration before accepting real payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-amber-400/20 bg-amber-400/[.07] px-4 py-2 text-center text-xs text-amber-200">
        Blackstar checkout is currently using the payment provider's test environment. No real charge will be created from this preview.
      </div>
    );
  }
  return null;
}
