import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { setCacheUser, clearCache } from '../lib/dataCache';

const AuthContext = createContext();
const RECOVERY_FLAG_KEY = 'ayos-recovery-pending';

async function resolveAdmin(session) {
  if (!session) return null;
  const [
    { data: isAdmin, error: roleError },
    { data, error: profileError },
    { data: permissions, error: permissionError },
    { data: adminRole, error: roleCodeError },
  ] = await Promise.all([
    supabase.rpc('is_admin', { require_aal2: false }),
    supabase.rpc('get_my_profile'),
    supabase.rpc('admin_get_my_permissions'),
    supabase.rpc('admin_get_my_role'),
  ]);
  if (
    roleError ||
    profileError ||
    !isAdmin ||
    data?.account?.status !== 'ACTIVE' ||
    data?.account?.role !== 'ADMIN' ||
    data?.active_role !== data.account.role ||
    !data?.profile?.display_name
  ) {
    await supabase.auth.signOut();
    throw new Error('A complete administrator database profile is required');
  }
  const myPermissions =
    permissionError?.code === 'PGRST202' ? [] : [...new Set(permissions ?? [])];
  return {
    id: data.account.id,
    email: data.account.email,
    name: data.profile.display_name,
    role: data.account.role,
    adminRole: roleCodeError?.code === 'PGRST202' ? null : (adminRole ?? null),
    profileComplete: Boolean(data.profile_complete),
    permissions: myPermissions,
  };
}

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recoverySession, setRecoverySession] = useState(
    () => localStorage.getItem(RECOVERY_FLAG_KEY) === '1',
  );

  const clearRecovery = () => {
    localStorage.removeItem(RECOVERY_FLAG_KEY);
    setRecoverySession(false);
  };

  const sync = async (session) => {
    if (localStorage.getItem(RECOVERY_FLAG_KEY) === '1') {
      setCacheUser(null);
      setUser(null);
      setAuthenticated(false);
      setRecoverySession(true);
      setLoading(false);
      return;
    }
    try {
      const admin = await resolveAdmin(session);
      setCacheUser(admin?.id ?? null);
      setUser(admin);
      setAuthenticated(Boolean(admin));
    } catch {
      setCacheUser(null);
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => sync(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        localStorage.setItem(RECOVERY_FLAG_KEY, '1');
        setRecoverySession(true);
        setCacheUser(null);
        setUser(null);
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      void sync(session);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    localStorage.removeItem(RECOVERY_FLAG_KEY);
    setRecoverySession(false);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    try {
      await supabase.functions.invoke('record-auth-session', { body: {} });
    } catch {
      /* non-fatal: login history is best-effort */
    }
    const admin = await resolveAdmin(data.session);
    setCacheUser(admin.id);
    setUser(admin);
    setAuthenticated(true);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCacheUser(null);
    clearCache();
    setAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, logout, loading, recoverySession, clearRecovery }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
