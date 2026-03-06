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

  const handleEnroll = (course: Course) => {
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-gray-200 relative overflow-hidden">
                <img 
                  src={course.coverImage} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                {course.isBestseller && (
                  <div className="absolute top-3 right-3 bg-black text-white px-3 py-1 rounded-full text-xs font-bold">
                    Bestseller
                  </div>
                )}
                {course.price === 0 && (
                  <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Free
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <p className="text-gray-600 text-sm mb-2">
                  {course.duration}
                </p>
                <h2 className="text-lg md:text-xl font-bold text-black mb-2">
                  {course.title}
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  {course.description}
                </p>

                <div className="flex items-center gap-2 md:gap-3 mb-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-300"></div>
                  <p className="font-bold text-sm md:text-base text-black">
                    {course.instructor}
                  </p>
                </div>

                <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-gray-600 mb-4">
                  <span>⭐ {course.rating}</span>
                  <span>{course.students}</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-black">
                    {course.price === 0 ? "Free" : `₹${course.price}`}
                  </span>
                </div>

                <button 
                  onClick={() => handleEnroll(course)}
                  className="w-full py-2 md:py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900 transition-colors"
                >
                  Enroll Free
                </button>
              </div>
            </div>
          ))}
        </div>
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
