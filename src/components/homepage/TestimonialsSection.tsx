"use client";

import { useState } from "react";

const testimonials = [
  {
    id: 1,
    rating: 5,
    quote:
      "The course structure is perfect for BPT students. Clinical videos made me actually understand knee assessment instead of just memorizing steps.",
    name: "Priya Verma",
    college: "Delhi Institute of Physiotherapy",
    year: "Final Year BPT",
  },
  {
    id: 2,
    rating: 5,
    quote:
      "Live doubt sessions with Dr. Arun Kumar were game-changers. Real-time feedback on my assessment techniques improved my confidence before OSCE.",
    name: "Arjun Singh",
    college: "Manipal College of Health Professions",
    year: "3rd Year BPT",
  },
  {
    id: 3,
    rating: 5,
    quote:
      "Finally found a platform that teaches actual clinical reasoning, not just theory. Every course feels relevant to what we do in hospitals.",
    name: "Ankita Desai",
    college: "Symbiosis Institute of Physiotherapy",
    year: "Final Year BPT",
  },
  {
    id: 4,
    rating: 5,
    quote:
      "The Sports Physio masterclass changed my internship experience. My clinical supervisors noticed the improvement in my assessment skills.",
    name: "Rohan Gupta",
    college: "Lovely Professional University",
    year: "3rd Year BPT",
  },
  {
    id: 5,
    rating: 5,
    quote:
      "I earned 3 certifications in a semester. Helped me stand out during job interviews. 100% recommend for career advancement.",
    name: "Shreya Patel",
    college: "JSS Academy of Higher Education",
    year: "Recent Graduate",
  },
  {
    id: 6,
    rating: 5,
    quote:
      "The neurological rehab course was exactly what I needed. Aligned perfectly with my university curriculum and went much deeper.",
    name: "Mehul Sharma",
    college: "GGSIPU Institute",
    year: "Final Year BPT",
  },
];

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const visibleTestimonials = 3;
  const maxIndex = Math.ceil(testimonials.length / visibleTestimonials) - 1;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <section className="w-full bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          What BPT Students Are Saying
        </h2>

        {/* Testimonials Slider */}
        <div className="relative mb-12 md:mb-16">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {Array.from({ length: maxIndex + 1 }).map((_, setIndex) => (
                <div
                  key={setIndex}
                  className="w-full flex-shrink-0 px-2 md:px-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {testimonials
                      .slice(
                        setIndex * visibleTestimonials,
                        (setIndex + 1) * visibleTestimonials
                      )
                      .map((testimonial) => (
                        <div
                          key={testimonial.id}
                          className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 hover:shadow-lg transition-shadow"
                        >
                          {/* Stars */}
                          <div className="flex gap-1 mb-4">
                            {Array.from({ length: testimonial.rating }).map(
                              (_, i) => (
                                <span key={i} className="text-lg md:text-xl">
                                  ⭐
                                </span>
                              )
                            )}
                          </div>

                          {/* Quote */}
                          <p className="text-sm md:text-base text-gray-700 italic mb-6 line-clamp-4">
                            "{testimonial.quote}"
                          </p>

                          {/* Author */}
                          <div className="pt-4 md:pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-300"></div>
                              <div>
                                <p className="font-bold text-sm md:text-base text-black">
                                  {testimonial.name}
                                </p>
                                <p className="text-xs md:text-sm text-gray-600">
                                  {testimonial.college}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs md:text-sm text-gray-600">
                              {testimonial.year}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center gap-2 md:gap-3 mt-8 md:mt-10">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all ${
                  currentIndex === index ? "bg-black w-8 md:w-12" : "bg-gray-300"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
