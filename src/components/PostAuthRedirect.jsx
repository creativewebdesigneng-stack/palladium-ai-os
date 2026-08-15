import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { consumePostAuthRedirect } from '@/lib/authReturnTo';

// Public routes the OAuth broker can land on. Once the Supabase session has
// hydrated we move the user to the destination they originally asked for.
const AUTH_ENTRY_PATHS = ['/', '/login', '/register'];

export default function PostAuthRedirect() {
  const { isAuthenticated, authChecked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authChecked || !isAuthenticated) return;
    if (!AUTH_ENTRY_PATHS.includes(location.pathname)) return;
    const target = consumePostAuthRedirect();
    if (target) navigate(target, { replace: true });
  }, [authChecked, isAuthenticated, location.pathname, navigate]);

  return null;
}
