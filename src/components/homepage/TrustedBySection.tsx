"use client";

const institutions = [
  "Delhi Institute of Physiotherapy",
  "Manipal College of Health Professions",
  "Symbiosis Institute of Physiotherapy",
  "AIIMS Delhi",
  "Lovely Professional University",
  "JSS Academy of Higher Education",
];

export function TrustedBySection() {
  return (
    <section className="w-full bg-white py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-gray-600 text-sm md:text-base font-medium mb-10 md:mb-16">
          Students from these institutions learn with us
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-8">
          {institutions.map((institution, index) => (
            <div
              key={index}
              className="flex items-center justify-center p-4 md:p-6 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors min-h-20 md:min-h-24"
            >
              <p className="text-xs md:text-sm text-gray-600 text-center font-medium">
                {institution}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
