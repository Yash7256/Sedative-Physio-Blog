"use client";

import { useState } from "react";

interface Article {
  id: number;
  title: string;
  url: string;
  category: string;
}

const pmcArticles: Article[] = [
  // Musculoskeletal
  {
    id: 1,
    title: "Musculoskeletal Pain: Current and Future Directions of Physical Therapy Practice",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10036231/",
    category: "Musculoskeletal",
  },
  {
    id: 2,
    title: "The Role of Physical Exercise in Chronic Musculoskeletal Pain: Best Medicine — A Narrative Review",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10815384/",
    category: "Musculoskeletal",
  },
  {
    id: 3,
    title: "A physiotherapist-led biopsychosocial education and exercise programme for patients with chronic low back pain in Ghana: a mixed-methods feasibility study",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11654333/",
    category: "Musculoskeletal",
  },
  {
    id: 4,
    title: "Effectiveness of Physiotherapy Exercises on Pain, Range of Motion, and Quality of Life in Patients With Ankylosing Spondylitis: A Case Report",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10907322/",
    category: "Musculoskeletal",
  },
  {
    id: 5,
    title: "Rehabilitation Strategies Following Posterolateral Corner Repair for Left Knee Dislocation With Multiligament Injury: A Case Report",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11040420/",
    category: "Musculoskeletal",
  },
  {
    id: 6,
    title: "Impact of direct access on the quality of primary care musculoskeletal physiotherapy: a scoping review from a patient, provider, and societal perspective",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11220609/",
    category: "Musculoskeletal",
  },
  // Telerehabilitation & Remote Care
  {
    id: 7,
    title: "Management of musculoskeletal conditions with remotely delivered physiotherapy versus face-to-face physiotherapy: process evaluation of the REFORM trial",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12410685/",
    category: "Telerehabilitation",
  },
  // Post-COVID & Respiratory
  {
    id: 8,
    title: "Physiotherapy interventions in post- and long-COVID-19: a scoping review protocol",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11367397/",
    category: "Post-COVID & Respiratory",
  },
  // Physical Activity & Behaviour Change
  {
    id: 9,
    title: "Physical activity promotion in physical therapy, exercise therapy and other movement-based therapies: a scoping review and content analysis",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12153217/",
    category: "Physical Activity",
  },
  // Leadership & Professional Development
  {
    id: 10,
    title: "Leadership and physiotherapy: A scoping review",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11168383/",
    category: "Leadership",
  },
  // Pain Research
  {
    id: 11,
    title: "Editorial: Insight in musculoskeletal pain — 2023",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11061523/",
    category: "Pain Research",
  },
];

const categories = [
  "All",
  "Musculoskeletal",
  "Telerehabilitation",
  "Post-COVID & Respiratory",
  "Physical Activity",
  "Leadership",
  "Pain Research",
];

export default function PubMedCentralPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredArticles = selectedCategory === "All"
    ? pmcArticles
    : pmcArticles.filter((article) => article.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <a href="/" className="hover:opacity-70">Home</a>
          <span>/</span>
          <span className="text-black">PubMed Central (PMC)</span>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4">
          PubMed Central (PMC)
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl">
          Full-text articles freely accessible. License shown on each article. Source: PubMed Central — CC BY (varies)
        </p>

        <div className="bg-yellow-100 text-yellow-800 text-sm font-bold px-4 py-2 rounded-lg inline-block mb-8">
          License: CC BY (varies per article)
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
