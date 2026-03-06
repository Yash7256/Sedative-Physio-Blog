'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/SupabaseProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { BookOpen, Clock, Calendar, ArrowLeft, Loader2, PlayCircle } from 'lucide-react';

interface Enrollment {
  id: number;
  course_id: number;
  course_title: string;
  instructor: string;
  price: number;
  enrolled_at: string;
}

export default function DashboardCoursesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<number, { progressPercent: number; completed: boolean }>>({});

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const response = await fetch('/api/enrollments/user');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch enrollments');
        }

        setEnrollments(data.enrollments || []);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchEnrollments();
    }
  }, [session]);

  useEffect(() => {
    const fetchProgress = async () => {
      const entries = await Promise.all(
        enrollments.map(async (enrollment) => {
          try {
            const response = await fetch(`/api/progress/${enrollment.course_id}`);
            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to fetch progress');
            }

            return [
              enrollment.course_id,
              {
                progressPercent: data.progress?.progressPercent || 0,
                completed: data.progress?.completed || false,
              },
            ] as const;
          } catch (err) {
            console.error('Progress fetch error:', err);
            return [
              enrollment.course_id,
              { progressPercent: 0, completed: false },
            ] as const;
          }
        })
      );

      setProgressMap(Object.fromEntries(entries));
    };

    if (session && enrollments.length > 0) {
      fetchProgress();
    }
  }, [session, enrollments]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCourseClick = (courseId: number) => {
    router.push(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="bg-white rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
              My Purchased Courses
            </h1>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            {enrollments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  No Courses Yet
                </h2>
                <p className="text-gray-500 mb-6">
                  You haven&apos;t purchased any courses yet. Browse our catalog to get started!
                </p>
                <button
                  onClick={() => router.push('/courses')}
                  className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900 transition-colors"
                >
                  Browse Courses
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    onClick={() => handleCourseClick(enrollment.course_id)}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors mb-2">
                          {enrollment.course_title}
                        </h3>
                        <p className="text-gray-600 mb-3">
                          Instructor: {enrollment.instructor}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Enrolled: {formatDate(enrollment.enrolled_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {enrollment.price === 0 ? 'Free' : `₹${enrollment.price}`}
                          </span>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                            <span>Progress</span>
                            <span className="font-semibold">
                              {progressMap[enrollment.course_id]?.progressPercent ?? 0}%{progressMap[enrollment.course_id]?.completed ? ' • Completed' : ''}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${progressMap[enrollment.course_id]?.completed ? 'bg-green-500' : 'bg-blue-500'} transition-all`}
                              style={{ width: `${progressMap[enrollment.course_id]?.progressPercent ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                          <PlayCircle className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
