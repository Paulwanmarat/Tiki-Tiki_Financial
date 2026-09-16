import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { LOCAL_API_URL } from '@/services/ai/client';

export interface User {
  id: string;
  email: string;
  email_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch(`${LOCAL_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error('Failed to fetch user', e);
    }
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUser(token);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        if (storedToken) {
          const decoded = jwtDecode<User & { exp: number }>(storedToken);
          if (decoded.exp * 1000 > Date.now()) {
            setToken(storedToken);
            setUser({ id: decoded.id, email: decoded.email, email_verified: false }); // initial state
            await fetchUser(storedToken);
          } else {
            await SecureStore.deleteItemAsync('userToken');
          }
        }
      } catch (e) {
        console.error('Session restore failed', e);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await SecureStore.setItemAsync('userToken', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
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
