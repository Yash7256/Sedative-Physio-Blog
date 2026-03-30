"use client";

import { useState } from "react";
import { useAuth } from "@/components/SupabaseProvider";
import { useRouter } from "next/navigation";
import CheckoutModal from "@/components/CheckoutModal";
import { CourseOverview, getCourseSummaries } from "@/lib/courseCatalog";

const courses: CourseOverview[] = getCourseSummaries();

export default function CoursesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState<CourseOverview | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const userEmail = session?.user?.email || null;

  const handleEnroll = (course: CourseOverview) => {
    if (!session) {
      router.push("/login");
      return;
    }
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black text-center mb-4">
          Courses
        </h1>
        <p className="text-gray-600 text-center text-lg mb-12 max-w-2xl mx-auto">
          Master physiotherapy with expert-led courses designed for students and clinicians.
        </p>

        {courses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No courses available yet. Check back soon!</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-gray-200 relative overflow-hidden">
                {course.coverImage ? (
                  <img 
                    src={course.coverImage} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">{course.title.charAt(0)}</span>
                  </div>
                )}
                {course.isBestseller && (
                  <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Bestseller
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 cursor-pointer" onClick={() => { setSelectedCourse(course); setIsModalOpen(true); }}>
                <p className="text-gray-600 text-sm mb-2">
                  {course.duration}
                </p>
                <h2 className="text-lg md:text-xl font-bold text-black mb-2">
                  {course.title}
                </h2>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {course.description}
                </p>

                {/* Topics Preview */}
                {course.topicsIncluded && course.topicsIncluded.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">{course.topicsIncluded.length} Topics Included</p>
                  </div>
                )}

                <div className="flex items-center gap-2 md:gap-3 mb-4">
                  {course.instructorImage ? (
                    <img src={course.instructorImage} alt={course.instructor} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-300"></div>
                  )}
                  <p className="font-bold text-sm md:text-base text-black">
                    {course.instructor}
                  </p>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-black">
                    {course.price === 0 ? "Free" : `₹${course.price}`}
                  </span>
                  <span className="text-sm text-indigo-600 font-medium">View Details →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {selectedCourse && (
        <CheckoutModal
          course={selectedCourse}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCourse(null);
          }}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}
