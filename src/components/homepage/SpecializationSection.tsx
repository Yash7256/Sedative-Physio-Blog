"use client";

const podcasts = [
  {
    id: 1,
    title: "Untold Truth About Physiotherapy",
    videoId: "XpMZgcNmpP4",
  },
  {
    id: 2,
    title: "Cardiopulmonary Physiotherapy",
    videoId: "Xaoj9W_R1XM",
  },
  {
    id: 3,
    title: "Science Of Physiotherapy",
    videoId: "mccQ3V3_d0k",
  },
  {
    id: 4,
    title: "Top Mistakes Physiotherapist Do",
    videoId: "doNJBgrTMss",
  },
];

export function FeaturedCoursesSection() {
  const scrollLeft = () => {
    const container = document.getElementById("podcast-container");
    if (container) {
      container.scrollBy({ left: -404, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById("podcast-container");
    if (container) {
      container.scrollBy({ left: 404, behavior: "smooth" });
    }
  };

  return (
    <section className="w-full bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          Podcast
        </h2>

        <div className="relative px-8 md:px-12">
          <button
            onClick={scrollLeft}
            className="absolute left-2 md:left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            id="podcast-container"
            className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth pb-4 pl-12 pr-12 md:px-14 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {podcasts.map((podcast) => (
              <div
                key={podcast.id}
                className="flex-shrink-0 w-[280px] md:w-[380px] bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${podcast.videoId}?si=ZgxnWB-e4eVZyrsQ`}
                    title={podcast.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="rounded-t-xl"
                  />
                </div>

                <div className="p-4 md:p-6">
                  <h4 className="text-base md:text-lg font-bold text-black">
                    {podcast.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={scrollRight}
            className="absolute right-2 md:right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

      </div>
    </section>
  );
}
