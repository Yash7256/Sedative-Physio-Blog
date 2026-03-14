"use client";

import { useState } from "react";

interface SpecialIssue {
  id: number;
  title: string;
  journal: string;
  url: string;
}

const mdpiSpecialIssues: SpecialIssue[] = [
  {
    id: 1,
    title: "Comprehensive Clinical Physiotherapy and Rehabilitation",
    journal: "Healthcare",
    url: "https://www.mdpi.com/journal/healthcare/special_issues/Clinical_Physiotherapy_Rehabilitation",
  },
  {
    id: 2,
    title: "Comprehensive Clinical Physiotherapy and Rehabilitation: Version II",
    journal: "Healthcare",
    url: "https://www.mdpi.com/journal/healthcare/special_issues/Clinical_Physiotherapy_Rehabilitation_II",
  },
  {
    id: 3,
    title: "New Advances in Physiotherapy and Rehabilitation",
    journal: "Applied Sciences",
    url: "https://www.mdpi.com/journal/applsci/special_issues/5L84O2S9B5",
  },
  {
    id: 4,
    title: "Clinical Updates in Physiotherapy for Musculoskeletal Disorders",
    journal: "Journal of Clinical Medicine",
    url: "https://www.mdpi.com/journal/jcm/special_issues/294K1H451Q",
  },
  {
    id: 5,
    title: "New Advances in Physical Therapy and Rehabilitation",
    journal: "IJERPH",
    url: "https://www.mdpi.com/journal/ijerph/special_issues/new_advance_physical_therapy_rehabilitation",
  },
  {
    id: 6,
    title: "Implementation of Up-to-Date Physiotherapy into the Health Care System",
    journal: "IJERPH",
    url: "https://www.mdpi.com/journal/ijerph/special_issues/Up-to-Date_Physiotherapy",
  },
  {
    id: 7,
    title: "Advances in Rehabilitation and Physiotherapy",
    journal: "Applied Sciences",
    url: "https://www.mdpi.com/journal/applsci/special_issues/29897S2002",
  },
];

const journals = ["All", "Healthcare", "Applied Sciences", "Journal of Clinical Medicine", "IJERPH"];

export default function MDPIJournalsPage() {
  const [selectedJournal, setSelectedJournal] = useState("All");

  const filteredIssues = selectedJournal === "All"
    ? mdpiSpecialIssues
    : mdpiSpecialIssues.filter((issue) => issue.journal === selectedJournal);

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <a href="/" className="hover:opacity-70">Home</a>
          <span>/</span>
          <span className="text-black">MDPI Journals</span>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4">
          MDPI Journals
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl">
          Covers musculoskeletal, neuro, sports, cardio rehab. Source: MDPI Journals — CC BY 4.0
        </p>

        <div className="bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-lg inline-block mb-8">
          License: CC BY 4.0
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {journals.map((journal) => (
            <button
              key={journal}
              onClick={() => setSelectedJournal(journal)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                selectedJournal === journal
                  ? "bg-black text-white"
                  : "bg-white text-black border border-gray-300 hover:bg-gray-100"
              }`}
            >
              {journal}
            </button>
          ))}
        </div>

        {filteredIssues.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-600 text-lg">
              No special issues found in this journal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredIssues.map((issue) => (
              <a
                key={issue.id}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow block"
              >
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded mb-3">
                  {issue.journal}
                </span>
                <h2 className="text-lg md:text-xl font-bold text-black mb-2">
                  {issue.title}
                </h2>
                <span className="text-black font-bold text-sm inline-flex items-center gap-1">
                  Visit Special Issue →
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
