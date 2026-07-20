import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  target_role: string | null;
  target_company: string | null;
  experience_level: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string, targetRole?: string, targetCompany?: string, experienceLevel?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User> & { password?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        // Restore cached session immediately so the UI never flickers
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Verify token against backend (non-blocking)
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (error: any) {
          // Only logout if the backend explicitly rejected the token (401/403).
          // Network errors (backend unreachable) should NOT clear the session.
          const status = error?.response?.status;
          if (status === 401 || status === 403) {
            console.error('Token rejected by server, logging out.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          } else {
            console.warn('Could not verify token (backend may be offline). Keeping cached session.');
          }
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // NOTE: Do NOT set isLoading here. The ProtectedRoute checks isLoading
    // and would show a blank/loading state during the navigate() transition,
    // causing a "black screen" flicker.
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (
    fullName: string,
    email: string,
    password: string,
    targetRole?: string,
    targetCompany?: string,
    experienceLevel?: string
  ) => {
    try {
      const response = await api.post('/auth/signup', {
        full_name: fullName,
        email,
        password,
        target_role: targetRole || null,
        target_company: targetCompany || null,
        experience_level: experienceLevel || null,
      });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  const updateProfile = async (data: Partial<User> & { password?: string }) => {
    try {
      const response = await api.put('/auth/profile', data);
      const updatedUser = response.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update profile', error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    signup,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
