import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount — try to restore session from stored token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }

    authApi.me()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
    localStorage.setItem('device_id', deviceId);

    const res = await authApi.login({ email, password, deviceId });
    localStorage.setItem('access_token',  res.data.accessToken);
    localStorage.setItem('refresh_token', res.data.refreshToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) await authApi.logout({ refreshToken });
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  }, []);

  // Role helpers — authorization is enforced on the server.
  // These helpers only control UI visibility, NOT security.
  const isBossOrAdmin  = user?.role === 'BOSS' || user?.role === 'ADMIN';
  const isStorekeeper  = user?.role === 'STOREKEEPER';
  const isVerifier     = user?.role === 'VERIFIER';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isBossOrAdmin, isStorekeeper, isVerifier }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
