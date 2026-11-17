import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Gates authenticated server-function queries until Supabase session hydration
 * completes. If the local auth client stalls or errors, fail closed to the
 * signed-out state rather than leaving every protected screen on a spinner.
 */
export function useSessionReady() {
  const [session, setSession] = useState('unknown');

  useEffect(() => {
    let alive = true;
    const timeout = setTimeout(() => {
      if (alive) setSession((current) => current === 'unknown' ? 'no' : current);
    }, 10000);

    const settle = (value) => {
      if (!alive) return;
      clearTimeout(timeout);
      setSession(value ? 'yes' : 'no');
    };

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        settle(data.session);
      })
      .catch(() => settle(null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, current) => settle(current));

    return () => {
      alive = false;
      clearTimeout(timeout);
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return session;
}

export default useSessionReady;
