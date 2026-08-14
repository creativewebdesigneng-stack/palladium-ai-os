import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Gates authenticated server-function queries until a Supabase session exists,
 * so protected reads never fire (and 401) before sign-in has hydrated.
 * Returns 'unknown' | 'yes' | 'no'.
 */
export function useSessionReady() {
  const [session, setSession] = useState('unknown');
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session ? 'yes' : 'no');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (alive) setSession(s ? 'yes' : 'no');
    });
    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);
  return session;
}

export default useSessionReady;
