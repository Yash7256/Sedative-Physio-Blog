"use client";

const steps = [
  {
    number: 1,
    emoji: "📝",
    title: "Create free account",
    description: "Sign up in 30 seconds",
  },
  {
    number: 2,
    emoji: "🎯",
    title: "Choose your specialization",
    description: "Pick from 6 clinical focus areas",
  },
  {
    number: 3,
    emoji: "📚",
    title: "Watch clinical videos + take quizzes",
    description: "Learn at your pace, anywhere",
  },
  {
    number: 4,
    emoji: "🏆",
    title: "Complete & earn your certificate",
    description: "Add to your professional profile",
  },
];

export function HowItWorksSection() {
  return (
    <section className="w-full bg-white py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <p className="text-center text-gray-600 text-sm md:text-base font-medium mb-4 md:mb-6">
          Getting Started
        </p>
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          Start Learning in 4 Simple Steps
        </h2>

        {/* Steps */}
        <div className="relative">
          {/* Dotted connector line */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-gray-300 via-gray-300 to-transparent opacity-50"></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                {/* Step Circle */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black text-white flex flex-col items-center justify-center mb-4 md:mb-6 relative">
                  <span className="text-2xl md:text-3xl">{step.emoji}</span>
                </div>

                {/* Step Number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm md:text-base font-bold">
                  {step.number}
                </div>

                {/* Title */}
                <h3 className="text-lg md:text-xl font-bold text-black text-center mb-2">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm md:text-base text-gray-600 text-center">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
