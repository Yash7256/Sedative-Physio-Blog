"use client";

const instructors = [
  {
    id: 1,
    name: "Dr. Priya Sharma",
    specialization: "Musculoskeletal & Orthopaedics",
    credentials: "MPT Ortho · Apollo Hospital · 12 yrs",
    rating: 4.9,
    students: 3241,
  },
  {
    id: 2,
    name: "Dr. Arun Kumar",
    specialization: "Neurological Physiotherapy",
    credentials: "MPT Neuro · AIIMS Delhi · 8 yrs",
    rating: 4.8,
    students: 2156,
  },
  {
    id: 3,
    name: "Dr. Deepak Menon",
    specialization: "Sports Physiotherapy",
    credentials: "MPT Sports · Fortis Healthcare · 10 yrs",
    rating: 4.9,
    students: 2890,
  },
  {
    id: 4,
    name: "Dr. Neha Singh",
    specialization: "Clinical Skills & Assessment",
    credentials: "MPT · Max Healthcare · 7 yrs",
    rating: 4.7,
    students: 1945,
  },
];

export function InstructorSection() {
  return (
    <section className="w-full bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <p className="text-center text-gray-600 text-sm md:text-base font-medium mb-4 md:mb-6">
          Our Experts
        </p>
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          Learn from Practicing Physiotherapists
        </h2>

        {/* Instructors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12 md:mb-16">
          {instructors.map((instructor) => (
            <div
              key={instructor.id}
              className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 text-center hover:shadow-lg transition-shadow"
            >
              {/* Avatar */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-300 mx-auto mb-4 md:mb-6"></div>

              {/* Name */}
              <h3 className="text-lg md:text-xl font-bold text-black mb-2">
                {instructor.name}
              </h3>

              {/* Specialization */}
              <p className="text-gray-600 text-sm md:text-base mb-4">
                {instructor.specialization}
              </p>

              {/* Credentials */}
              <p className="text-xs md:text-sm text-gray-600 mb-4">
                {instructor.credentials}
              </p>

              {/* Rating */}
              <div className="flex items-center justify-center gap-2 text-sm md:text-base text-gray-600 mb-6">
                <span>⭐ {instructor.rating}</span>
                <span>•</span>
                <span>{instructor.students.toLocaleString()} students</span>
              </div>

              {/* CTA Link */}
              <a
                href="#"
                className="text-black font-bold text-sm md:text-base hover:opacity-70 transition-opacity inline-flex items-center gap-1"
              >
                View Profile →
              </a>
            </div>
          ))}
        </div>

        {/* Meet All Instructors Button */}
        <div className="flex justify-center">
          <button className="px-8 md:px-10 py-3 md:py-4 border-2 border-black text-black font-bold rounded-full hover:bg-black hover:text-white transition-colors">
            Meet All Instructors →
          </button>
        </div>
      </div>
    </section>
  );
}
