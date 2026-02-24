"use client";

const articles = [
  {
    id: 1,
    category: "Clinical Reasoning",
    title: "How to Approach Cervical Radiculopathy Assessment",
    excerpt:
      "A systematic approach to diagnosis and treatment planning for cervical conditions...",
    readTime: "8 min",
  },
  {
    id: 2,
    category: "Sports Physio",
    title: "Return to Play Protocol for ACL Reconstruction",
    excerpt:
      "Evidence-based phases, timelines, and testing criteria for safe return to sport...",
    readTime: "12 min",
  },
  {
    id: 3,
    category: "Neuro",
    title: "Neuroplasticity in Stroke Recovery: Clinical Applications",
    excerpt:
      "Understanding brain plasticity and how to use it in your rehabilitation programs...",
    readTime: "10 min",
  },
];

export function BlogPreviewSection() {
  return (
    <section className="w-full bg-gray-50 py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}

        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          Resources to Sharpen Your Clinical Thinking
        </h2>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <span className="text-5xl md:text-6xl">📖</span>
              </div>

              {/* Content */}
              <div className="p-6 md:p-8">
                {/* Category */}
                <p className="text-xs md:text-sm text-gray-600 font-bold mb-3 md:mb-4">
                  {article.category}
                </p>

                {/* Title */}
                <h3 className="text-lg md:text-xl font-bold text-black mb-3 md:mb-4 group-hover:opacity-70 transition-opacity">
                  {article.title}
                </h3>

                {/* Excerpt */}
                <p className="text-sm md:text-base text-gray-700 mb-6 md:mb-8">
                  {article.excerpt}
                </p>

                {/* CTA & Read Time */}
                <div className="flex items-center justify-between">
                  <a
                    href="#"
                    className="text-black font-bold text-sm md:text-base hover:opacity-70 transition-opacity inline-flex items-center gap-1"
                  >
                    Read Article →
                  </a>
                  <span className="text-xs md:text-sm text-gray-600">
                    {article.readTime}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <button className="px-8 md:px-10 py-3 md:py-4 border-2 border-black text-black font-bold rounded-full hover:bg-black hover:text-white transition-colors">
            Explore All Resources →
          </button>
        </div>
      </div>
    </section>
  );
}
