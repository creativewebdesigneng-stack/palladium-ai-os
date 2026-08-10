import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/integrations/supabase/client';
import { getMyEntitlements } from '@/lib/platform/platform.functions';

const AuthContext = createContext(null);

/**
 * Authentication + entitlement provider.
 *
 * Identity comes from the Supabase session; the plan comes from the server-side
 * entitlement engine (`subscriptions` table, written only by verified Stripe
 * webhooks). Nothing here reads localStorage, and there is no development
 * bypass — the previous mock admin session was removed in the production audit.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      if (!me) {
        setUser(null);
        setEntitlements(null);
        setIsAuthenticated(false);
        setAuthError(null);
        return null;
      }

      // Authoritative plan resolution — server side, RLS scoped to this user.
      let ent = null;
      try {
        ent = await getMyEntitlements({ data: {} });
      } catch {
        ent = null;
      }
      const enriched = ent ? { ...me, subscription_plan: ent.planCode, subscription_status: ent.status } : me;

      setUser(enriched);
      setEntitlements(ent);
      setIsAuthenticated(true);
      setAuthError(null);
      return enriched;
    } catch (error) {
      setUser(null);
      setEntitlements(null);
      setIsAuthenticated(false);
      setAuthError(error?.message ?? 'Authentication failed');
      return null;
    } finally {
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') return;
      checkUserAuth();
    });
    return () => data?.subscription?.unsubscribe();
  }, [checkUserAuth]);

  const login = useCallback(async (email, password) => {
    await base44.auth.loginViaEmailPassword(email, password);
    return checkUserAuth();
  }, [checkUserAuth]);

  const logout = useCallback(async () => {
    await base44.auth.logout();
    setUser(null);
    setEntitlements(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    setUser,
    entitlements,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    authChecked,
    checkUserAuth,
    checkAppState: checkUserAuth,
    login,
    logout,
    appPublicSettings: null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export default AuthContext;
