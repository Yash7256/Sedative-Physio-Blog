'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/SupabaseProvider';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for OAuth errors
      if (errorParam) {
        setError(errorDescription || errorParam);
        setLoading(false);
        return;
      }

      // If we have a session, the OAuth was successful
      // The Supabase client automatically handles code exchange with PKCE
      if (session) {
        // Session was created successfully by SupabaseProvider
        router.push('/');
        return;
      }

      // Wait a bit for session to be established
      // (first time, session might not be set immediately)
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    };

    handleCallback();
  }, [searchParams, router, session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Authentication Failed</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}
