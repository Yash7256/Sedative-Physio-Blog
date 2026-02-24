"use client";

import { useAuth } from '@/components/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  fallback?: ReactNode;
}

/**
 * ProtectedRoute component
 * 
 * Wraps pages that require authentication. Redirects to login if user is not authenticated.
 * 
 * @example
 * ```tsx
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPage />
 * </ProtectedRoute>
 * ```
 */
export default function ProtectedRoute({
  children,
  requiredRole,
  fallback
}: ProtectedRouteProps) {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && mounted && !session) {
      // User is not authenticated, redirect to login
      router.push('/login');
    }
  }, [isLoading, session, router, mounted]);

  // Show loading state while checking authentication
  if (isLoading || !mounted) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // User is not authenticated
  if (!session) {
    return null;
  }

  // Check role if required
  if (requiredRole) {
    const userRole = session.user?.user_metadata?.role || 'user';
    if (userRole !== requiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
            <p className="text-gray-600">You do not have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and has required role (if any)
  return <>{children}</>;
}
