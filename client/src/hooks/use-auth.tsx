import React, { createContext, useContext, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: { email: string; password: string; name: string; role: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [error, setError] = useState<Error | null>(null);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['auth-user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user');
        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error('Failed to fetch user');
        }
        return response.json();
      } catch (e) {
        console.error('Auth error:', e);
        return null;
      }
    },
    retry: false,
    staleTime: 300000, // 5 minutes
  });

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const userData = await response.json();
      queryClient.setQueryData(['auth-user'], userData);
      setError(null);
    } catch (e) {
      const error = e as Error;
      setError(error);
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      queryClient.setQueryData(['auth-user'], null);
      setError(null);
    } catch (e) {
      const error = e as Error;
      setError(error);
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const register = async (data: { email: string; password: string; name: string; role: string }) => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const userData = await response.json();
      queryClient.setQueryData(['auth-user'], userData);
      setError(null);
    } catch (e) {
      const error = e as Error;
      setError(error);
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;