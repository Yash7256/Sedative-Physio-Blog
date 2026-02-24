"use client";

import { useAuth } from '@/components/SupabaseProvider';
import { useRouter } from 'next/navigation';
import UserProfileDropdown from '@/components/UserProfileDropdown';

export default function LoginButton() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  // If authenticated, show the user profile dropdown
  if (session) {
    return <UserProfileDropdown />;
  }

  // If not authenticated, show Sign In button
  return (
    <button
      onClick={() => router.push('/login')}
      disabled={isLoading}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
    >
      Sign In
    </button>
  );
}