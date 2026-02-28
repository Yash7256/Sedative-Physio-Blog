"use client";

import { useState, useEffect, useRef } from "react";

const testimonials = [
  {
    id: 1,
    rating: 5,
    quote:
      "The course structure is perfect for Physiotherapy students. Clinical videos made me actually understand knee assessment instead of just memorizing steps.",
    name: "Priya Verma",
    college: "Delhi Institute of Physiotherapy",
    year: "Final Year Physiotherapy",
  },
  {
    id: 2,
    rating: 5,
    quote:
      "Live doubt sessions with Dr. Akshay Kumar were game-changers. Real-time feedback on my assessment techniques improved my confidence before OSCE.",
    name: "Arjun Singh",
    college: "Manipal College of Health Professions",
    year: "3rd Year Physiotherapy",
  },
  {
    id: 3,
    rating: 5,
    quote:
      "Finally found a platform that teaches actual clinical reasoning, not just theory. Every course feels relevant to what we do in hospitals.",
    name: "Ankita Desai",
    college: "Symbiosis Institute of Physiotherapy",
    year: "Final Year Physiotherapy",
  },
  {
    id: 4,
    rating: 5,
    quote:
      "The Sports Physio masterclass changed my internship experience. My clinical supervisors noticed the improvement in my assessment skills.",
    name: "Rohan Gupta",
    college: "Lovely Professional University",
    year: "3rd Year Physiotherapy",
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
    year: "Final Year Physiotherapy",
  },
  {
    id: 7,
    rating: 5,
    quote:
      "Dr. Akshay Sir, you've been a game-changer for me! The lectures are engaging, informative, and make complex topics feel manageable. Your dedication to student success is evident in every session. I'm grateful for the motivation and inspiration that drives me to learn and grow. Highly recommended.",
    name: "Vakil Ayesha",
    college: "",
    year: "",
  },
  {
    id: 8,
    rating: 5,
    quote:
      "It was very informative. Really liked that you care to stop and explain every step. Highly recommended for Physiotherapy students.",
    name: "Ashwin Mascarenhas",
    college: "Mangalore, Karnataka",
    year: "Intern/MPT",
  },
  {
    id: 9,
    rating: 5,
    quote:
      "Best productive session. Learned so much about neurological conditions.",
    name: "Dr Touqeer Abbas",
    college: "Punjab",
    year: "Pakistan",
  },
  {
    id: 10,
    rating: 5,
    quote:
      "Very nice explanation. The webinar on neuro conditions was extremely helpful.",
    name: "Dr Shifa Shaikh",
    college: "Ahmedabad",
    year: "India",
  },
  {
    id: 11,
    rating: 5,
    quote:
      "It has been very wonderful. I have been waiting for it for a very long time. Great learning experience!",
    name: "Rachkara Samuel Baker",
    college: "Central Uganda",
    year: "Uganda",
  },
  {
    id: 12,
    rating: 5,
    quote:
      "This was the first time I attended a session like this and the experience was great. The session was definitely a success and I'm definitely looking forward for more such amazing sessions.",
    name: "Anjali",
    college: "Haryana",
    year: "India",
  },
  {
    id: 13,
    rating: 5,
    quote:
      "The Sedative Physio webinar on shoulder instability and its rehab was really helpful! The session was clear, easy to understand, and packed with useful information.",
    name: "Abhishek Singh",
    college: "Delhi",
    year: "India",
  },
  {
    id: 14,
    rating: 5,
    quote:
      "It was a wonderful session. Sir explained each and every topic of Shoulder Instability in detailed. Specially the rehab program was also very precise.",
    name: "Namita",
    college: "West Bengal",
    year: "India",
  },
  {
    id: 15,
    rating: 5,
    quote:
      "The webinar on Shoulder Instability was concise, informative, and engaging. The speaker explained complex concepts clearly, covering anatomy, diagnosis, and management effectively.",
    name: "Ashutosh",
    college: "Karnataka",
    year: "India",
  },
  {
    id: 16,
    rating: 5,
    quote:
      "This webinar provided clear and concise insights into shoulder instability. The content was practical and evidence-based, making it both engaging and highly relevant.",
    name: "Smith",
    college: "London",
    year: "UK",
  },
  {
    id: 17,
    rating: 5,
    quote:
      "Today I learn lots of new knowledge on Parkinson. Webinar was very effective and very useful for knowledge. Thank you so much sir!",
    name: "Dr Rohit Sen",
    college: "Dolphin PG College Dehradun",
    year: "Consultant Physiotherapist",
  },
  {
    id: 18,
    rating: 5,
    quote:
      "Well explained and learned a lot new things. Great webinar experience!",
    name: "Harsha Chennupalli",
    college: "SIMS College of Physiotherapy",
    year: "India",
  },
  {
    id: 19,
    rating: 5,
    quote:
      "It was a really great experience learning Neuro from you, concepts are now crystal clear. Thank you!",
    name: "Prajkta Gondkar",
    college: "Mahalaxmi College of Physiotherapy",
    year: "India",
  },
  {
    id: 20,
    rating: 5,
    quote:
      "Very good webinar and all doubts are clear. Highly informative session.",
    name: "Dewre Khalid Kausar Ahmad",
    college: "KPGU",
    year: "Physiotherapy 3rd Year",
  },
  {
    id: 21,
    rating: 5,
    quote:
      "I know your teaching style, skills and patterns and I really appreciate them. Sorry I couldn't join the webinar but looking forward to the next one!",
    name: "Aryan Patel",
    college: "Shree M.M Shah Physiotherapy College",
    year: "India",
  },
];

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const visibleTestimonials = 3;
  const maxIndex = Math.ceil(testimonials.length / visibleTestimonials) - 1;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [maxIndex]);

  return (
    <section className="w-full bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          What Physiotherapy Students Are Saying
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
                          className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 hover:shadow-lg transition-shadow"
                        >
                          {/* Quote */}
                          <p className="text-sm md:text-base text-gray-700 italic mb-4 line-clamp-3">
                            "{testimonial.quote}"
                          </p>

                          {/* Author */}
                          <div className="pt-3 md:pt-4 border-t border-gray-200">
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
