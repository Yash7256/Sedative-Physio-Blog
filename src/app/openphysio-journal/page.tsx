"use client";

import { useState } from "react";

interface Article {
  id: number;
  title: string;
  url: string;
  category: string;
}

const articles: Article[] = [
  {
    id: 1,
    title: "The Physio2Future model and its eligibility for sustainable physiotherapy",
    url: "https://www.openphysiojournal.com/article/is-the-physio2future-model-suitable-as-an-orientation-for-sustainable-physiotherapy/",
    category: "Community & Ethics",
  },
  {
    id: 2,
    title: "Involving people with lived experience in physiotherapy education – Research report three: Developing equal partnerships",
    url: "https://www.openphysiojournal.com/article/involving-people-with-lived-experience-in-physiotherapy-education-research-report-3-developing-equal-partnerships/",
    category: "Education & Pedagogy",
  },
  {
    id: 3,
    title: "Involving people with lived experience in physiotherapy education – Research report two: Harnessing the expertise of people with lived experience",
    url: "https://www.openphysiojournal.com/article/involving-people-with-lived-experience-in-physiotherapy-education-research-report-two-harnessing-the-expertise-of-people-with-lived-experience/",
    category: "Education & Pedagogy",
  },
  {
    id: 4,
    title: "Involving people with lived experience in physiotherapy education – Research report one: Reflecting together to enhance teaching outcomes",
    url: "https://www.openphysiojournal.com/article/involving-people-with-lived-experience-in-physiotherapy-education-research-report-one-reflecting-together-to-enhance-teaching-outcomes/",
    category: "Education & Pedagogy",
  },
  {
    id: 5,
    title: "Physiotherapy skills in the difference of years of therapists' experience and affiliations",
    url: "https://www.openphysiojournal.com/article/physiotherapy-skills-in-the-difference-of-years-of-therapists-experience-and-affiliations/",
    category: "Clinical Practice",
  },
  {
    id: 6,
    title: "Physiotherapy students promoting health and well-being of school-aged children and adolescents in North Karelia, Finland",
    url: "https://www.openphysiojournal.com/article/physiotherapy-students-promoting-health-and-well-being-of-school-aged-children-and-adolescents-in-north-karelia-finland/",
    category: "Community & Ethics",
  },
  {
    id: 7,
    title: "Physiotherapy students' perception of their clinical learning environment and clinician teaching attributes in Nigeria",
    url: "https://www.openphysiojournal.com/article/physiotherapy-students-perception-of-their-clinical-learning-environment-and-clinicians-teaching-attributes-in-nigeria/",
    category: "Clinical Practice",
  },
  {
    id: 8,
    title: "Diagnostic uncertainty in musculoskeletal pain: Implications for physiotherapy education",
    url: "https://www.openphysiojournal.com/article/diagnostic-uncertainty-in-physiotherapy-implications-for-physiotherapy-education/",
    category: "Clinical Practice",
  },
  {
    id: 9,
    title: "A way forward: Teaching lens for embedding 4C's in 21st century learning for future Physiotherapy Graduates Education",
    url: "https://www.openphysiojournal.com/article/a-way-forward-teaching-lens-for-embedding-4cs-in-21st-century-learning-for-future-physiotherapy-graduates-education/",
    category: "Education & Pedagogy",
  },
  {
    id: 10,
    title: "Rethinking screen time during COVID-19: Impact on sleep and academic performance in physiotherapy students",
    url: "https://www.openphysiojournal.com/article/rethinking-screen-time-during-covid-19-impact-on-sleep-and-academic-performance-in-physiotherapy-students/",
    category: "Technology & Digital",
  },
  {
    id: 11,
    title: "Responding to COVID-19: LUNEX University's decisions and actions to continue physiotherapy education",
    url: "https://www.openphysiojournal.com/article/responding-to-covid-19-lunex-universitys-decisions-and-actions-to-continue-physiotherapy-education/",
    category: "Education & Pedagogy",
  },
  {
    id: 12,
    title: "QuaranTrain: An international community of practice for learning",
    url: "https://www.openphysiojournal.com/article/quarantrain-an-international-community-of-practice-for-learning/",
    category: "Education & Pedagogy",
  },
  {
    id: 13,
    title: "Digital confidence, experience and motivation in physiotherapists: A UK-wide survey",
    url: "https://www.openphysiojournal.com/article/digital-confidence-experience-and-motivation-in-physiotherapists-a-uk-wide-survey/",
    category: "Technology & Digital",
  },
  {
    id: 14,
    title: "Contagious precarity: A collective biographical analysis of early-career physiotherapist academics' experiences of the COVID-19 pandemic",
    url: "https://www.openphysiojournal.com/article/contagious-precarity-a-collective-biographical-analysis-of-early-career-physiotherapist-academics-experiences-of-the-covid-19-pandemic/",
    category: "Community & Ethics",
  },
  {
    id: 15,
    title: "An overnight shift towards remote teaching and learning of musculoskeletal physiotherapy in Karelia University of Applied Sciences in Finland",
    url: "https://www.openphysiojournal.com/article/an-overnight-shift-towards-remote-teaching-and-learning-of-musculoskeletal-physiotherapy-in-karelia-university-of-applied-sciences-in-finland/",
    category: "Education & Pedagogy",
  },
  {
    id: 16,
    title: "Project-based learning for physiotherapy clinical education quality and capacity",
    url: "https://www.openphysiojournal.com/article/project-based-learning-for-physiotherapy-clinical-education-quality-and-capacity/",
    category: "Education & Pedagogy",
  },
  {
    id: 17,
    title: "Ten guiding principles for movement training in neurorehabilitation",
    url: "https://www.openphysiojournal.com/article/ten-guiding-principles-for-movement-training-in-neurorehabilitation/",
    category: "Clinical Practice",
  },
  {
    id: 18,
    title: "Exploring barriers, advantages and potentials in realising clinical education in private physiotherapy practice settings in Germany",
    url: "https://www.openphysiojournal.com/article/exploring-barriers-advantages-and-potentials-in-realising-clinical-education-in-private-physiotherapy-practice-settings-in-germany/",
    category: "Clinical Practice",
  },
  {
    id: 19,
    title: "The fundamental violence of physiotherapy: Emmanuel Levinas's critique of ontology and its implications for physiotherapy theory and practice",
    url: "https://www.openphysiojournal.com/article/the-fundamental-violence-of-physiotherapy-emmanuel-levinass-critique-of-ontology-and-its-implications-for-physiotherapy-theory-and-practice/",
    category: "Community & Ethics",
  },
  {
    id: 20,
    title: "Infusing Rehabilitation with Critical Research and Scholarship: A Call to Action",
    url: "https://www.openphysiojournal.com/article/infusing-rehabilitation-with-critical-research-and-scholarship-a-call-to-action/",
    category: "Community & Ethics",
  },
  {
    id: 21,
    title: "Artificial intelligence in clinical practice: Implications for physiotherapy education",
    url: "https://www.openphysiojournal.com/article/artificial-intelligence-in-clinical-practice-implications-for-physiotherapy-education/",
    category: "Technology & Digital",
  },
  {
    id: 22,
    title: "Students' learning preferences and experience in a globalised world: Opportunity to optimise internationalisation in physiotherapy education",
    url: "https://www.openphysiojournal.com/article/students-learning-experience-and-experience-in-a-globalised-world-opportunity-to-optimise-internationalisation-in-physiotherapy-education/",
    category: "Education & Pedagogy",
  },
  {
    id: 23,
    title: "Physiotherapy students' conceptualisations of clinical communication: A call to revisit communication in physiotherapy education",
    url: "https://www.openphysiojournal.com/article/physiotherapy-students-conceptualisations-clinical-communication-call-revisit-communication-physiotherapy-education/",
    category: "Research & Scholarship",
  },
  {
    id: 24,
    title: "Embracing a dialogue about cost in physiotherapy education",
    url: "https://www.openphysiojournal.com/article/embracing-a-dialogue-about-cost-in-physiotherapy-education/",
    category: "Education & Pedagogy",
  },
];

const categories = [
  "All",
  "Education & Pedagogy",
  "Clinical Practice",
  "Technology & Digital",
  "Community & Ethics",
  "Research & Scholarship",
];

export default function OpenPhysioJournalPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredArticles = selectedCategory === "All"
    ? articles
    : articles.filter((article) => article.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <a href="/" className="hover:opacity-70">Home</a>
          <span>/</span>
          <span className="text-black">OpenPhysio Journal</span>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4">
          OpenPhysio Journal
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl">
          Focused on physiotherapy education specifically. Source: OpenPhysio Journal — CC BY 4.0
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
