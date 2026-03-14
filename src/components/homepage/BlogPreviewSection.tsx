"use client";

import { useState } from "react";

const resources = [
  {
    id: 1,
    name: "OpenPhysio Journal",
    description: "Focused on physiotherapy education specifically.",
    license: "CC BY 4.0",
    url: "/openphysio-journal",
    isExternal: false,
  },
  {
    id: 2,
    name: "MDPI Journals",
    description: "Covers musculoskeletal, neuro, sports, cardio rehab.",
    license: "CC BY 4.0",
    url: "/mdpi-journals",
    isExternal: false,
  },
  {
    id: 3,
    name: "PubMed Central (PMC)",
    description: "Full-text articles freely accessible.",
    license: "CC BY (varies)",
    url: "/pubmed-central",
    isExternal: false,
  },
  {
    id: 4,
    name: "Physiotherapy — Elsevier",
    description: "Filter by Open Access to find free articles.",
    license: "CC BY 4.0",
    url: "/physiotherapy-elsevier",
    isExternal: false,
  },
  {
    id: 5,
    name: "Archives of Physiotherapy",
    description: "Open access journal for physiotherapy research.",
    license: "CC BY 4.0",
    url: "/archives-physiotherapy",
    isExternal: false,
  },
];

export function BlogPreviewSection() {
  const scrollLeft = () => {
    const container = document.getElementById("resources-container");
    if (container) {
      container.scrollBy({ left: -404, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    const container = document.getElementById("resources-container");
    if (container) {
      container.scrollBy({ left: 404, behavior: "smooth" });
    }
  };

  return (
    <section className="w-full bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
         Journals
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
            id="resources-container"
            className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth pb-4 pl-12 pr-12 md:px-14 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="flex-shrink-0 w-[280px] md:w-[380px] bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base md:text-lg font-bold text-black">
                      {resource.name}
                    </h4>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                      {resource.license}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-4">
                    {resource.description}
                  </p>

                  <p className="text-xs text-gray-500 mb-4">
                    Source: {resource.name} — {resource.license}
                  </p>

                  <a
                    href={resource.url}
                    {...(resource.isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="inline-flex items-center text-black font-bold text-sm hover:opacity-70 transition-opacity"
                  >
                    Visit Journal →
                  </a>
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
