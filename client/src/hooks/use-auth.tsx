import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
  updateUser: (updatedUserData: User) => void;
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
  const [user, setUser] = useState<User | null>(null); // Added user state
  const [isLoading, setIsLoading] = useState(true); // Added loading state

  useEffect(() => {
    // Fetch user on initial load
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user');
      if (response.status === 401) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      setUser(data);
      setIsLoading(false);
    } catch (e) {
      console.error('Auth error:', e);
      setUser(null);
      setIsLoading(false);
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data); // Update user state directly
      queryClient.setQueryData(['auth-user'], data);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      setUser(null); // Update user state directly
      queryClient.removeQueries();
      queryClient.setQueryData(['auth-user'], null);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string; role: string }) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data); // Update user state directly
      queryClient.setQueryData(['auth-user'], data);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateUser = (updatedUserData: User) => {
    setUser(prev => {
      if (!prev) return updatedUserData;
      return { ...prev, ...updatedUserData };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;