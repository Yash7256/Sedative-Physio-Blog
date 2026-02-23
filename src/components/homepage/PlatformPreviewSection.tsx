"use client";

export function PlatformPreviewSection() {
  const features = [
    {
      emoji: "▶️",
      title: "HD clinical technique video player",
    },
    {
      emoji: "📝",
      title: "Chapter-wise quizzes after each lesson",
    },
    {
      emoji: "📊",
      title: "Progress tracking dashboard",
    },
    {
      emoji: "💬",
      title: "Live Q&A with instructors",
    },
  ];

  return (
    <section className="w-full bg-gradient-to-br from-purple-600 to-purple-700 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left: Features */}
          <div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-8 md:mb-10 leading-tight">
              See What Learning Looks Like Inside
            </h2>

            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex gap-3 md:gap-4 items-start group"
                >
                  <span className="text-3xl md:text-4xl flex-shrink-0 group-hover:scale-110 transition-transform">
                    {feature.emoji}
                  </span>
                  <p className="text-lg md:text-xl text-white font-medium pt-1">
                    {feature.title}
                  </p>
                </div>
              ))}
            </div>

            <button className="px-8 md:px-10 py-3 md:py-4 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-colors">
              Get Free Access →
            </button>
          </div>

          {/* Right: Browser Mockup */}
          <div className="flex justify-center md:justify-end">
            <div className="w-full max-w-sm bg-gray-900 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-800">
              {/* Browser Header */}
              <div className="bg-gray-800 px-4 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-3">
                <div className="flex gap-1 md:gap-2">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-gray-600"></div>
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-gray-600"></div>
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-gray-600"></div>
                </div>
                <div className="flex-1 bg-gray-700 rounded px-2 md:px-3 py-1 text-xs md:text-sm text-gray-400">
                  sedativephysio.com/courses/...
                </div>
              </div>

              {/* Browser Content */}
              <div className="aspect-video bg-gradient-to-br from-purple-500/30 to-purple-700/40 relative overflow-hidden flex items-center justify-center p-4 md:p-6">
                {/* Video Play Icon */}
                <div className="flex flex-col items-center gap-3 md:gap-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 border-2 border-white flex items-center justify-center backdrop-blur-sm">
                    <div className="w-0 h-0 border-l-8 border-l-white border-t-5 border-t-transparent border-b-5 border-b-transparent ml-1"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-sm md:text-base">
                      ACL Reconstruction Rehab
                    </p>
                    <p className="text-white/70 text-xs md:text-sm">
                      18 min remaining
                    </p>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 space-y-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-white/10"></div>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-white/10"></div>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-white/10"></div>
                </div>

                {/* Bottom Timeline */}
                <div className="absolute bottom-0 left-0 right-0 h-8 md:h-10 bg-black/30 border-t border-white/10">
                  <div className="h-1 bg-purple-400 mt-2 md:mt-3 ml-2 md:ml-3" style={{ width: "40%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
