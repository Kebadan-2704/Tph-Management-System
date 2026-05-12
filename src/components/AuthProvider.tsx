'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type AuthRole = 'admin' | null;

type AuthContextType = {
  authRole: AuthRole;
  userEmail: string | null;
  isLoading: boolean;
  login: (password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  authRole: null,
  userEmail: null,
  isLoading: true,
  login: async () => ({ error: null }),
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authRole, setAuthRole] = useState<AuthRole>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.role === 'admin') {
          setAuthRole('admin');
          setUserEmail('admin@tph.local');
        } else {
          setAuthRole(null);
          setUserEmail(null);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setAuthRole('admin');
        setUserEmail('admin@tph.local');
        return { error: null };
      }

      return { error: data.error || 'Invalid password' };
    } catch (err) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setAuthRole(null);
    setUserEmail(null);
  };

  return (
    <AuthContext.Provider value={{ authRole, userEmail, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
