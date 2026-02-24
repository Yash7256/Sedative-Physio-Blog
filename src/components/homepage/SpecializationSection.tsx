"use client";

const specializations = [
  { name: "Orthopaedics", courses: "Clinical + PT" },
  { name: "Neurological Physiotherapy", courses: "Clinical + PT" },
  { name: "Electrotherapy",},
  { name: "Anatomy & Biomechanics",},
];

const featuredCourses = [
  {
    id: 1,
    specialty: "Biomechanics",
    title: "Biiomechanics Masterclass with 3D Demonstration",
    instructor: "Dr. Akshay Kumar",
    rating: 4.9,
    batch: "New Batch Starting Soon",
    coverImage: "/images/1.jpeg",
    isBestseller: true,
  },

];

export function SpecializationSection() {
  return (
    <section className="w-full bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          Find Your Clinical Focus Area
        </h2>

        {/* Specialization Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-16 md:mb-20">
          {specializations.map((spec, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:border-black hover:shadow-lg transition-all duration-200 group cursor-pointer"
            >
              <h3 className="text-lg md:text-xl font-bold text-black mb-2">
                {spec.name}
              </h3>
              <p className="text-gray-600 text-sm md:text-base mb-4">
                {spec.courses || ""} Courses
              </p>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <a href="#" className="text-black font-bold text-sm">
                  Explore →
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Featured Courses */}
        <h3 className="text-2xl md:text-3xl font-bold text-black mb-8 md:mb-10">
          Featured Courses
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
          {featuredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Thumbnail */}
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

              {/* Content */}
              <div className="p-6 md:p-8">
                <p className="text-xs md:text-sm text-gray-600 font-medium mb-2">
                  {course.specialty}
                </p>
                <h4 className="text-lg md:text-xl font-bold text-black mb-4">
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
                  <span>{course.batch}</span>
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
          <button className="px-8 md:px-10 py-3 md:py-4 border-2 border-black text-black font-bold rounded-full hover:bg-black hover:text-white transition-colors">
            Browse All Courses →
          </button>
        </div>
      </div>
    </section>
  );
}
