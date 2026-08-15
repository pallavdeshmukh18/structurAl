import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProviderGitHub {
  id?: string;
  username?: string;
}

export interface UserProviders {
  github?: UserProviderGitHub;
  google?: { id?: string };
}

export interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  providers?: UserProviders;
  role: 'user' | 'admin';
  lastLoginAt?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginWithGitHub: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_BASE_URL || "");

const ERROR_MESSAGE_MAP: Record<string, string> = {
  oauth_cancelled: 'GitHub authentication was cancelled or could not be completed.',
  token_exchange_failed: 'Unable to verify authorization code with GitHub. Please try again.',
  profile_fetch_failed: 'Unable to fetch your GitHub profile details.',
  session_error: 'Could not establish session. Please ensure cookies are enabled.',
  server_error: 'An internal server error occurred during authentication.',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check initial session & handle URL query errors on mount
  useEffect(() => {
    // 1. Check URL query parameters for OAuth errors
    const searchParams = new URLSearchParams(window.location.search);
    const oauthErrorParam = searchParams.get('error');

    if (oauthErrorParam) {
      const friendlyMsg = ERROR_MESSAGE_MAP[oauthErrorParam] || `Authentication error: ${oauthErrorParam}`;
      setError(friendlyMsg);
      // Clean query parameter from browser address bar without reloading
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // 2. Check current authenticated user session
    fetchUserSession();
  }, []);

  const fetchUserSession = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGitHub = () => {
    window.location.href = `${API_BASE_URL}/api/auth/github`;
  };

  const logout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        setUser(null);
        setError(null);
      } else {
        console.error('Logout request failed');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        loginWithGitHub,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
