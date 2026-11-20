import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, tokenStore } from '@/lib/api';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) {
      setChecking(false);
      return;
    }
    api
      .get('/auth/me')
      .then(setUser)
      .catch(() => tokenStore.set(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('netsurex:logout', onLogout);
    return () => window.removeEventListener('netsurex:logout', onLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    tokenStore.set(res.access_token);
    setUser({ email: res.email });
  }, []);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  return <AdminAuthContext.Provider value={{ user, checking, login, logout }}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => useContext(AdminAuthContext);

export const RequireAdmin = ({ children }) => {
  const { user, checking } = useAdminAuth();
  const location = useLocation();
  if (checking) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
};
