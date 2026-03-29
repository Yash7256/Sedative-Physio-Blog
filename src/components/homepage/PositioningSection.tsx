"use client";

export function PositioningSection() {
  const differentiators = [
    "Every course made by practicing physiotherapists",
    "Content aligned with Physiotherapy university curriculum",
    "Practical clinical technique video demonstrations",
    "Specialized tracks: Ortho, Neuro, Sports, Cardiopulmonary",
    "Learn at your pace + live doubt sessions",
    "Earn certificates for your clinical profile",
  ];

  return (
    <section className="w-full bg-white py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Label */}


        {/* Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          Not a General Platform. Built Exclusively for Physio.
        </h2>

        {/* 2-Column Layout */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left: Visual */}
          <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 p-8 md:p-12 aspect-square flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-teal-400 opacity-30"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-pink-400 opacity-20"></div>
            <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-yellow-400 opacity-25"></div>

            <div className="text-center relative z-10">
              <div className="text-6xl md:text-7xl mb-4">🧠</div>
              <p className="text-white text-lg md:text-xl font-bold">
                Clinical Excellence
              </p>
              <p className="text-purple-100 text-sm mt-2">
                Built by experts, for students
              </p>
            </div>
          </div>

          {/* Right: Differentiators */}
          <div>
            <div className="space-y-4 md:space-y-5">
              {differentiators.map((point, index) => (
                <div key={index} className="flex gap-3 md:gap-4">
                  <div className="flex-shrink-0 pt-1">
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6 text-black"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                    {point}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA - Commented out until link is available
            <div className="mt-8 md:mt-10">
              <a
                href="#"
                className="text-base md:text-lg font-bold text-black hover:opacity-70 transition-opacity inline-flex items-center gap-2"
              >
                See How We're Different →
              </a>
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
}
