"use client";

import { useState } from "react";

interface Article {
  id: number;
  title: string;
  url: string;
  category: string;
}

const journalOfPhysiotherapyArticles: Article[] = [
  // Musculoskeletal
  {
    id: 1,
    title: "Physiotherapy management of patellofemoral pain in adolescents",
    url: "https://www.sciencedirect.com/science/article/pii/S1836955324001231",
    category: "Musculoskeletal",
  },
  {
    id: 2,
    title: "Telerehabilitation consultations with a physiotherapist are non-inferior to in-person consultations for chronic knee pain",
    url: "https://www.sciencedirect.com/science/article/pii/S1836955324000547",
    category: "Musculoskeletal",
  },
  {
    id: 3,
    title: "Effect of involving physiotherapists in the management of low back pain at emergency departments: a systematic review",
    url: "https://www.sciencedirect.com/science/article/pii/S0031940624004632",
    category: "Musculoskeletal",
  },
  {
    id: 4,
    title: "Barriers, facilitators and referral patterns of general practitioners, physiotherapists, and people with osteoarthritis to exercise",
    url: "https://www.sciencedirect.com/science/article/pii/S0031940624004255",
    category: "Musculoskeletal",
  },
  {
    id: 5,
    title: "Acceptability of physiotherapists as primary care practitioners for the care of people with musculoskeletal disorders: a French population-based cross-sectional survey",
    url: "https://www.sciencedirect.com/science/article/pii/S0031940624004620",
    category: "Musculoskeletal",
  },
  {
    id: 6,
    title: "Physiotherapy management of people with spinal cord injuries: an update",
    url: "https://www.sciencedirect.com/science/article/pii/S1836955324001024",
    category: "Musculoskeletal",
  },
  // Research Priorities & Profession
  {
    id: 7,
    title: "Priorities in physical therapy research: A scoping review",
    url: "https://www.sciencedirect.com/science/article/pii/S1413355524005458",
    category: "Research Priorities",
  },
  // Technology & AI
  {
    id: 8,
    title: "A systematic review of the application of deep learning techniques in the physiotherapeutic therapy of musculoskeletal pathologies",
    url: "https://www.sciencedirect.com/science/article/pii/S0010482524001665",
    category: "Technology & AI",
  },
  // Neurological
  {
    id: 9,
    title: "Physiotherapy for patients with functional movement disorder: a systematic review",
    url: "https://www.sciencedirect.com/science/article/pii/S2173580823000330",
    category: "Neurological",
  },
  // Service Delivery & Workforce
  {
    id: 10,
    title: "Agreeing priority categories and items for inclusion in a future best practice delegation framework for musculoskeletal outpatient physiotherapy services",
    url: "https://www.sciencedirect.com/science/article/pii/S2468781224000729",
    category: "Service Delivery",
  },
];

const categories = [
  "All",
  "Musculoskeletal",
  "Research Priorities",
  "Technology & AI",
  "Neurological",
  "Service Delivery",
];

export default function PhysiotherapyElsevierPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredArticles = selectedCategory === "All"
    ? journalOfPhysiotherapyArticles
    : journalOfPhysiotherapyArticles.filter((article) => article.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <a href="/" className="hover:opacity-70">Home</a>
          <span>/</span>
          <span className="text-black">Physiotherapy — Elsevier</span>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4">
          Physiotherapy — Elsevier Open Access
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl">
          Filter by Open Access to find free articles. Source: Physiotherapy — Elsevier — CC BY 4.0
        </p>

        <div className="bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-lg inline-block mb-8">
          License: CC BY 4.0
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                selectedCategory === category
                  ? "bg-black text-white"
                  : "bg-white text-black border border-gray-300 hover:bg-gray-100"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {filteredArticles.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-600 text-lg">
              No articles found in this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredArticles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow block"
              >
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded mb-3">
                  {article.category}
                </span>
                <h2 className="text-lg md:text-xl font-bold text-black mb-2">
                  {article.title}
                </h2>
                <span className="text-black font-bold text-sm inline-flex items-center gap-1">
                  Read Article →
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
