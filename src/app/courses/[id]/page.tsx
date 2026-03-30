'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/SupabaseProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import QuizTabs from '@/components/course/QuizTabs';
import {
  ArrowLeft,
  PlayCircle,
  FileText,
  Download,
  Clock,
  User,
  CheckCircle,
  Circle,
  Lock,
  Loader2,
  X,
} from 'lucide-react';
import { CourseContent, getCourseById } from '@/lib/courseCatalog';

export default function CourseContentPage() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [currentLesson, setCurrentLesson] = useState<{ title: string; videoUrl?: string } | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);

  const fetchProgress = async () => {
    try {
      setProgressLoading(true);
      const response = await fetch(`/api/progress/${courseId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load progress');
      }

      setCompletedLessons(data.progress?.completedLessons || []);
      setProgressPercent(data.progress?.progressPercent || 0);
      setProgressError(null);
    } catch (err: any) {
      setProgressError(err.message || 'Failed to load progress');
    } finally {
      setProgressLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (Number.isNaN(courseId)) {
        setLoading(false);
        return;
      }

      const courseData = getCourseById(courseId);
      if (courseData) {
        setCourse(courseData);
        setExpandedSections([0]);
      }

      if (!session) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/enrollments/user');
        const data = await response.json();

        if (response.ok && data.enrollments) {
          const isEnrolled = data.enrollments.some(
            (e: { course_id: number }) => e.course_id === courseId
          );
          setEnrolled(isEnrolled);

          if (isEnrolled) {
            await fetchProgress();
          }
        }
      } catch (error) {
        console.error('Error checking enrollment:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [session, courseId]);

  const toggleSection = (index: number) => {
    setExpandedSections(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleLessonToggle = async (lessonId: string, isCompleted: boolean) => {
    setUpdatingLessonId(lessonId);
    try {
      const response = await fetch(`/api/progress/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, completed: !isCompleted }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update progress');
      }

      setCompletedLessons(data.progress?.completedLessons || []);
      setProgressPercent(data.progress?.progressPercent || 0);
      setProgressError(null);
    } catch (err: any) {
      setProgressError(err.message || 'Failed to update progress');
    } finally {
      setUpdatingLessonId(null);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!course) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Course Not Found</h1>
            <button
              onClick={() => router.push('/courses')}
              className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900"
            >
              Browse Courses
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!enrolled) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => router.push('/dashboard/courses')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to My Courses
            </button>
            
            <div className="bg-white rounded-lg shadow-xl p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">
                Enrollment Required
              </h1>
              <p className="text-gray-600 mb-6">
                You need to enroll in this course to access its content.
              </p>
              <button
                onClick={() => router.push('/courses')}
                className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900 transition-colors"
              >
                Enroll Now
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => router.push('/dashboard/courses')}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to My Courses
            </button>
            
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-full md:w-64 h-40 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                <img 
                  src={course.coverImage} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
                <p className="text-white/80 mb-4">{course.description}</p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 text-sm text-white/70">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {course.instructor}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Enrolled
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 max-w-lg">
                    <div className="flex items-center justify-between text-sm text-white/80 mb-2">
                      <span>Progress</span>
                      <span className="font-semibold">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/70 mt-2">
                      <span>
                        {progressLoading ? 'Syncing progress...' : 'Auto-saves as you mark lessons'}
                      </span>
                      {progressPercent === 100 && (
                        <span className="flex items-center gap-1 text-green-100">
                          <CheckCircle className="w-4 h-4" />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-8 px-4">
          {course.sections.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Course Content</h2>
                {progressError && (
                  <span className="text-sm text-red-600">{progressError}</span>
                )}
              </div>
              
              <div className="space-y-4">
                {course.sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(sectionIndex)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="font-semibold text-gray-800">
                        Section {sectionIndex + 1}: {section.title}
                      </span>
                      <span className="text-sm text-gray-500">
                        {section.lessons.length} lessons
                      </span>
                    </button>
                    
                    {expandedSections.includes(sectionIndex) && (
                      <div className="divide-y divide-gray-100">
                        {section.lessons.map((lesson) => {
                          const isCompleted = completedLessons.includes(lesson.id);
                          const isUpdating = updatingLessonId === lesson.id;

                          return (
                            <div
                              key={lesson.id}
                              onClick={() => lesson.type === 'video' && lesson.videoUrl && setCurrentLesson({ title: lesson.title, videoUrl: lesson.videoUrl })}
                              className={`p-4 flex items-center gap-4 ${
                                lesson.type === 'video' && lesson.videoUrl ? 'hover:bg-blue-50 cursor-pointer' : ''
                              }`}
                            >
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                {lesson.type === 'video' ? (
                                  <PlayCircle className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <FileText className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{lesson.title}</p>
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  {lesson.duration}
                                </p>
                              </div>
                              {lesson.type === 'pdf' && (
                                <Download className="w-5 h-5 text-gray-400" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLessonToggle(lesson.id, isCompleted);
                                }}
                                disabled={isUpdating}
                                className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg border transition ${
                                  isCompleted
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                                } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {isUpdating ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isCompleted ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                                <span>{isCompleted ? 'Completed' : 'Mark done'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <QuizTabs courseId={courseId} topics={course.topicsIncluded?.map((topic, idx) => ({
            id: String(idx + 1),
            name: topic,
            description: ''
          })) || []} />
        </div>

        {currentLesson && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl">
              <button
                onClick={() => setCurrentLesson(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 flex items-center gap-2"
              >
                <X className="w-6 h-6" />
                Close
              </button>
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={`${currentLesson.videoUrl}?autoplay=1`}
                  title={currentLesson.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <h3 className="text-white text-xl font-bold mt-4">{currentLesson.title}</h3>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
