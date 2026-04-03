"use client";

import { useAuth } from '@/components/SupabaseProvider';
import { formatUserDisplay, getUserEmail } from '@/lib/authUtils';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loader2, User, Edit2, Save, X } from 'lucide-react';

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  college: string | null;
  course: string | null;
  year_semester: string | null;
  gender: string | null;
  email: string | null;
}

const YEAR_SEMESTER_OPTIONS = [
  "1st Year", "2nd Year", "3rd Year", "4th Year",
  "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
  "5th Semester", "6th Semester", "7th Semester", "8th Semester",
  "Completed"
];

export default function DashboardPage() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    full_name: null,
    avatar_url: null,
    college: null,
    course: null,
    year_semester: null,
    gender: null,
    email: null,
  });
  const [formData, setFormData] = useState<UserProfile>({
    full_name: '',
    avatar_url: '',
    college: '',
    course: '',
    year_semester: '',
    gender: '',
    email: '',
  });

  useEffect(() => {
    if (session) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (res.ok && data.profile) {
        const p = data.profile;
        setProfile(p);
        setFormData({
          full_name: p.full_name || '',
          avatar_url: p.avatar_url || '',
          college: p.college || '',
          course: p.course || '',
          year_semester: p.year_semester || '',
          gender: p.gender || '',
          email: p.email || getUserEmail(session),
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      setProfile(formData);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile.full_name || '',
      avatar_url: profile.avatar_url || '',
      college: profile.college || '',
      course: profile.course || '',
      year_semester: profile.year_semester || '',
      gender: profile.gender || '',
      email: profile.email || '',
    });
    setIsEditing(false);
    setError(null);
  };

  const isProfileComplete = profile.full_name && profile.college && profile.course && profile.year_semester && profile.gender;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
                    {success}
                  </div>
                )}

                {/* Profile Completeness Banner */}
                {!isProfileComplete && !isEditing && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="text-amber-700">
                      <p className="font-semibold">Complete Your Profile</p>
                      <p className="text-sm mt-1">Please fill in all your details to enroll in courses.</p>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="ml-auto px-3 py-1 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition"
                    >
                      Complete
                    </button>
                  </div>
                )}

                {/* Profile Avatar & Name */}
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {isEditing ? (formData.full_name || 'Your Name') : (profile.full_name || 'Your Name')}
                    </h2>
                    <p className="text-gray-500">{getUserEmail(session)}</p>
                  </div>
                </div>

                {/* Profile Fields */}
                <div className="space-y-4">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={formData.full_name || ''}
                          onChange={(e) => handleChange('full_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">College *</label>
                        <input
                          type="text"
                          value={formData.college || ''}
                          onChange={(e) => handleChange('college', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                          placeholder="Enter your college name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                        <input
                          type="text"
                          value={formData.course || ''}
                          onChange={(e) => handleChange('course', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                          placeholder="e.g., BPT, MPT, BPTh"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year/Semester *</label>
                        <select
                          value={formData.year_semester || ''}
                          onChange={(e) => handleChange('year_semester', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                        >
                          <option value="">Select Year/Semester</option>
                          {YEAR_SEMESTER_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                        <select
                          value={formData.gender || ''}
                          onChange={(e) => handleChange('gender', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition"
                        >
                          <X className="w-5 h-5" />
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-semibold text-gray-800">{profile.full_name || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Gender</p>
                        <p className="font-semibold text-gray-800">{profile.gender || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">College</p>
                        <p className="font-semibold text-gray-800">{profile.college || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Course</p>
                        <p className="font-semibold text-gray-800">{profile.course || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Year/Semester</p>
                        <p className="font-semibold text-gray-800">{profile.year_semester || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-semibold text-gray-800">{profile.email || getUserEmail(session) || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                {!isEditing && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => router.push('/dashboard/courses')}
                        className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold text-gray-700"
                      >
                        → My Purchased Courses
                      </button>
                      <button
                        onClick={() => router.push('/courses')}
                        className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold text-gray-700"
                      >
                        → Browse Courses
                      </button>
                    </div>
                  </div>
                )}

                {/* Sign Out Button */}
                {!isEditing && (
                  <button
                    onClick={handleSignOut}
                    className="w-full bg-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-700 transition duration-200"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
