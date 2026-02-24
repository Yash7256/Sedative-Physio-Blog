'use client';

import { useAuth } from '@/components/SupabaseProvider';
import { formatUserDisplay, getUserEmail, getUserRole } from '@/lib/authUtils';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardPage() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">
              Dashboard
            </h1>

            {session && (
              <div className="space-y-6">
                {/* User Info Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Account Information
                  </h2>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {formatUserDisplay(session)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {getUserEmail(session)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Role</p>
                      <div className="inline-block">
                        <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                          {getUserRole(session)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">User ID</p>
                      <p className="text-sm font-mono text-gray-600 break-all">
                        {session.user.id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Quick Actions
                  </h2>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push('/admin')}
                      className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold text-gray-700"
                    >
                      → Admin Panel
                    </button>
                    
                    <button
                      onClick={() => router.push('/notes')}
                      className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold text-gray-700"
                    >
                      → My Notes
                    </button>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="w-full bg-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-700 transition duration-200"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
