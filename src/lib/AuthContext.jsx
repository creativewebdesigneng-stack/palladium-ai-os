import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/integrations/supabase/client';
import { isDevAdminSession, DEV_ADMIN_USER } from '@/lib/access';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async () => {
    try {
      // Development-only mock admin session (frontend bypass).
      if (isDevAdminSession()) {
        setUser(DEV_ADMIN_USER);
        setIsAuthenticated(true);
        setAuthError(null);
        return DEV_ADMIN_USER;
      }
      const me = await base44.auth.me();
      setUser(me);
      setIsAuthenticated(Boolean(me));
      setAuthError(null);
      return me;
    } catch (error) {
      setUser(null);
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
    const { data } = supabase.auth.onAuthStateChange(() => {
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
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    setUser,
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
