import ErrorState from '@/components/palladium/ErrorState';

export default function Forbidden() {
  return <div className="blackstar-public-page blackstar-public-error min-h-screen bg-[#050508] text-zinc-100"><ErrorState variant="403" /></div>;
}
