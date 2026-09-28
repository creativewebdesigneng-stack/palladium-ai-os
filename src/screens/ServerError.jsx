import ErrorState from '@/components/palladium/ErrorState';

export default function ServerError() {
  return <div className="blackstar-public-page blackstar-public-error min-h-screen bg-[#050508] text-zinc-100"><ErrorState variant="500" onRetry={() => window.location.reload()} /></div>;
}
