"use client";

const featuredCourses = [
  {
    id: 1,
    title: "Neuro Anatomy",
    instructor: "Dr. Akshay Kumar",
    rating: 4.9,
    students: "500+ Students",
    coverImage: "/images/1.jpeg",
    isBestseller: true,
  },
];

export function FeaturedCoursesSection() {
  return (
    <section className="w-full bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          Featured Courses
        </h2>

        {/* Featured Courses */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
          {featuredCourses.map((course) => (
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
              </div>

              <div className="p-6 md:p-8">
                <h4 className="text-lg md:text-xl font-bold text-black mb-2">
                  {course.title}
                </h4>

                <div className="flex items-center gap-2 md:gap-3 mb-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-300"></div>
                  <p className="font-bold text-sm md:text-base text-black">
                    {course.instructor}
                  </p>
                </div>

                <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-gray-600 mb-6">
                  <span>⭐ {course.rating}</span>
                  <span>{course.students}</span>
                </div>

                <button className="w-full py-2 md:py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900 transition-colors">
                  Enroll Free
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Browse All Button */}
        <div className="flex justify-center">
          <a href="/courses" className="px-8 md:px-10 py-3 md:py-4 border-2 border-black text-black font-bold rounded-full hover:bg-black hover:text-white transition-colors">
            Browse All Courses →
          </a>
        </div>
      </div>
    </section>
  );
}
