"use client";

import { createBrowserClient } from '@supabase/ssr';
import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

// Define types for session and user
interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

interface Session {
  user: User;
  expires_at?: number;
}

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Check if we're in a browser environment and if Supabase keys are available
  const hasValidSupabaseConfig = typeof window !== 'undefined' && 
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = useMemo(() => {
    if (hasValidSupabaseConfig) {
      return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    // Return a mock client if no valid config
    return null;
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hasValidSupabaseConfig) {
      console.warn("Supabase configuration is missing. Running in offline mode.");
      setIsLoading(false);
      return;
    }

    if (!supabase) return;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error.message);
        }

        setSession(session);
      } catch (err) {
        console.error('Network error getting session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Handle URL hash for OAuth callback (moved from SupabaseInitializer)
    const handleInitialUrl = async () => {
      const url = new URL(window.location.href);
      const hash = url.hash.substring(1);

      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          try {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
          } catch (err) {
            console.error('Error setting session from hash:', err);
          }
        }
      }
    };

    handleInitialUrl().then(getInitialSession);

    // Set up auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event);
      setSession(session);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, hasValidSupabaseConfig]);

  const signInWithGoogle = async () => {
    if (!hasValidSupabaseConfig || !supabase) {
      console.error("Supabase is not configured. Cannot sign in with Google.");
      alert("Authentication service is not available. Please check your configuration.");
      return;
    }
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Error signing in with Google:', error.message);
        throw error;
      }
    } catch (err) {
      console.error('Network error signing in with Google:', err);
      alert("Could not connect to authentication service. Please try again later.");
    }
  };

  const signOut = async () => {
    if (!hasValidSupabaseConfig || !supabase) {
      // In offline mode, just clear the session
      setSession(null);
      return;
    }
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
      }
      setSession(null);
    } catch (err) {
      console.error('Network error signing out:', err);
      setSession(null); // Clear session anyway
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!hasValidSupabaseConfig || !supabase) {
      console.error("Supabase is not configured. Cannot sign in with email.");
      return { error: { message: "Authentication service is not available." } };
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Error signing in with email:', error.message);
        return { error };
      }

      return { data };
    } catch (err) {
      console.error('Network or API error during sign in:', err);
      return { error: { message: 'Authentication service unavailable' } };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!hasValidSupabaseConfig || !supabase) {
      console.error("Supabase is not configured. Cannot sign up with email.");
      return { error: { message: "Authentication service is not available." } };
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error('Error signing up with email:', error.message);
        return { error };
      }

      return { data };
    } catch (err) {
      console.error('Network or API error during sign up:', err);
      return { error: { message: 'Authentication service unavailable' } };
    }
  };

  const resetPassword = async (email: string) => {
    if (!hasValidSupabaseConfig || !supabase) {
      console.error("Supabase is not configured. Cannot reset password.");
      return { error: { message: "Authentication service is not available." } };
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        console.error('Error resetting password:', error.message);
        return { error };
      }

      return { success: true };
    } catch (err) {
      console.error('Network or API error during password reset:', err);
      return { error: { message: 'Authentication service unavailable' } };
    }
  };

  const contextValue: AuthContextType = {
    session,
    isLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}