import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { consumePostAuthRedirect } from '@/lib/authReturnTo';
import { shouldConsumePostAuthRedirect } from '@/lib/authUiState';

export default function PostAuthRedirect() {
  const { isAuthenticated, authChecked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!shouldConsumePostAuthRedirect({ authChecked, isAuthenticated }, location.pathname)) return;
    const target = consumePostAuthRedirect();
    if (target) navigate(target, { replace: true });
  }, [authChecked, isAuthenticated, location.pathname, navigate]);

  return null;
}
