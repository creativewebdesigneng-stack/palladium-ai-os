import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { can } from '@/lib/permissions';

// Provides app-wide feature gating. `gate(feature)` returns true when the
// current user's plan allows the feature; otherwise it opens the upgrade modal
// and returns false. Use it in click handlers before performing a restricted
// action. The modal itself is rendered by <UpgradeModal /> (in AppShell).
const UpgradeContext = createContext(null);

export function UpgradeProvider({ children }) {
  const { user } = useAuth();
  const [feature, setFeature] = useState(null);

  const open = useCallback((f) => setFeature(f), []);
  const close = useCallback(() => setFeature(null), []);
  const gate = useCallback((f) => {
    if (can(user, f)) return true;
    setFeature(f);
    return false;
  }, [user]);

  return (
    <UpgradeContext.Provider value={{ gate, open, close, activeFeature: feature }}>
      {children}
    </UpgradeContext.Provider>
  );
}

export const useUpgrade = () => {
  const ctx = useContext(UpgradeContext);
  if (!ctx) throw new Error('useUpgrade must be used within an UpgradeProvider');
  return ctx;
};