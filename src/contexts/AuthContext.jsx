import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({});

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('nsk_admin_token');
      if (!token) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.admin);
          setIsAdmin(true);
        } else {
          localStorage.removeItem('nsk_admin_token');
          setUser(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('[AuthContext] Session verify error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const signInWithGoogle = async () => {
    // Optional Google sign-in fallback
    throw new Error('Please sign in using your Admin Email and Password');
  };

  const signInWithEmail = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Invalid email or password');
    }

    localStorage.setItem('nsk_admin_token', data.token);
    setUser(data.admin);
    setIsAdmin(true);
    return { user: data.admin };
  };

  const signOut = async () => {
    localStorage.removeItem('nsk_admin_token');
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      isGamer: !!user && !isAdmin,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function getAuthToken() {
  return localStorage.getItem('nsk_admin_token');
}
