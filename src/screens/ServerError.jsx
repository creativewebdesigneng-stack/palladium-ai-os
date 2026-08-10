import ErrorState from '@/components/palladium/ErrorState';

export default function ServerError() {
  return <ErrorState variant="500" onRetry={() => window.location.reload()} />;
}