'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/SupabaseProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ArrowLeft, PlayCircle, FileText, Download, Clock, User, CheckCircle, Lock, Loader2, X } from 'lucide-react';

interface CourseContent {
  id: number;
  title: string;
  instructor: string;
  duration: string;
  coverImage: string;
  description: string;
  sections: CourseSection[];
}

interface CourseSection {
  title: string;
  lessons: { title: string; duration: string; type: 'video' | 'pdf'; videoUrl?: string; pdfUrl?: string }[];
}

const coursesData: Record<number, CourseContent> = {
  1: {
    id: 1,
    title: "Neuro Anatomy",
    instructor: "Dr. Akshay Kumar",
    duration: "12 Hours",
    coverImage: "https://i.ibb.co/F4bLdr2Q/Whats-App-Image-2026-02-28-at-9-14-27-PM.jpg",
    description: "Complete neuroanatomy course with detailed explanations and 3D demonstrations.",
    sections: [
      {
        title: "Introduction to Neuroanatomy",
        lessons: [
          { title: "Basal Ganglia Affernet Connections", duration: "20 min 36 sec", type: "video", videoUrl: "https://www.youtube.com/embed/EmqDzL6FbSI" },
          { title: "Basal Ganglia Anatomy", duration: "21 min 16 sec", type: "video", videoUrl: "https://www.youtube.com/embed/C91yU3AhixU" },
          { title: "Functional Area Of Cerebral Cortex", duration: "27 min 27 sec", type: "video", videoUrl: "https://www.youtube.com/embed/G84g7zEffe4" },
          { title: "Sulcus & Gyrus on Medical & Inferior Surface", duration: "23 min 32 sec", type: "video", videoUrl: "https://www.youtube.com/embed/5XxhhPyJ_7U" },
          { title: "Cerebrum Part 1", duration: "25 min 32 sec", type: "video", videoUrl: "https://www.youtube.com/embed/5HxMaRzLUBI" },
        ],
      },
    ],
  },
};

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

  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        const response = await fetch('/api/enrollments/user');
        const data = await response.json();
        
        if (response.ok && data.enrollments) {
          const isEnrolled = data.enrollments.some(
            (e: { course_id: number }) => e.course_id === courseId
          );
          setEnrolled(isEnrolled);
        }
        
        const courseData = coursesData[courseId];
        if (courseData) {
          setCourse(courseData);
          setExpandedSections([0]);
        }
      } catch (error) {
        console.error('Error checking enrollment:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session && courseId) {
      checkEnrollment();
    }
  }, [session, courseId]);

  const toggleSection = (index: number) => {
    setExpandedSections(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
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
              <div>
                <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
                <p className="text-white/80 mb-4">{course.description}</p>
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
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Course Content</h2>
            
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
                      {section.lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lessonIndex}
                          onClick={() => lesson.type === 'video' && lesson.videoUrl && setCurrentLesson({ title: lesson.title, videoUrl: lesson.videoUrl })}
                          className={`p-4 flex items-center gap-4 ${lesson.type === 'video' && lesson.videoUrl ? 'hover:bg-blue-50 cursor-pointer' : ''}`}
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
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
