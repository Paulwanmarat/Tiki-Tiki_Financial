import { LOCAL_API_URL } from '@/services/ai/client';
import { getTokenSafe, setTokenSafe, removeTokenSafe } from '@/utils/storage';
import { jwtDecode } from 'jwt-decode';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface User {
  id: string;
  email: string;
  email_verified?: boolean;
  username?: string | null;
  avatar_url?: string | null;
  role?: 'owner' | 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  refreshUserProfile: () => Promise<void>;
  markEmailVerified: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [initialData] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedToken = window.localStorage.getItem('userToken');
        if (storedToken) {
          const decoded = jwtDecode<User & { exp: number }>(storedToken);
          if (decoded && decoded.exp * 1000 > Date.now()) {
            return {
              token: storedToken,
              user: {
                id: decoded.id,
                email: decoded.email,
                email_verified: decoded.email_verified !== undefined ? Boolean(decoded.email_verified) : true,
                username: decoded.username || null,
                role: decoded.role || 'user',
              },
              isLoading: false,
            };
          }
        }
      } catch (err) {
        console.warn('Sync auth restore error:', err);
      }
    }
    return { token: null, user: null, isLoading: Platform.OS !== 'web' };
  });

  const [user, setUser] = useState<User | null>(initialData.user);
  const [token, setToken] = useState<string | null>(initialData.token);
  const [isLoading, setIsLoading] = useState<boolean>(initialData.isLoading);

  const fetchUser = async (authToken: string): Promise<User | null> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${LOCAL_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return data.user;
      }
    } catch (e) {
      console.warn('Failed to fetch user session from server, using local session state:', e);
    }
    return null;
  };

  const refreshUser = async (): Promise<User | null> => {
    const activeToken = token || (await getTokenSafe('userToken'));
    if (activeToken) {
      return await fetchUser(activeToken);
    }
    return null;
  };

  const markEmailVerified = () => {
    setUser((prev) => (prev ? { ...prev, email_verified: true } : prev));
  };

  const refreshUserProfile = async () => {
    if (token) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`${LOCAL_API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (e) {
        console.error('Failed to fetch user profile', e);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 3000);

    const restoreSession = async () => {
      try {
        const storedToken = await getTokenSafe('userToken');
        if (storedToken) {
          const decoded = jwtDecode<User & { exp: number }>(storedToken);
          if (decoded.exp * 1000 > Date.now()) {
            setToken(storedToken);
            setUser({
              id: decoded.id,
              email: decoded.email,
              email_verified: decoded.email_verified !== undefined ? Boolean(decoded.email_verified) : true,
              username: decoded.username || null,
              role: (decoded as any).role || 'user',
            });
            await fetchUser(storedToken);
          } else {
            await removeTokenSafe('userToken');
          }
        }
      } catch (e) {
        console.error('Session restore failed', e);
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) setIsLoading(false);
      }
    };
    restoreSession();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await setTokenSafe('userToken', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await removeTokenSafe('userToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser, refreshUserProfile, markEmailVerified }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
