"use client";

import { useState } from "react";

interface Article {
  id: number;
  title: string;
  url: string;
  year?: number;
}

const archivesOfPhysiotherapyArticles: Article[] = [
  // 2024 (Vol. 14)
  {
    id: 1,
    title: "A decade of growth: preserving the original meaning of research for physiotherapists",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3293",
    year: 2024,
  },
  {
    id: 2,
    title: "Red flags for potential serious pathologies in people with neck pain: a systematic review of clinical practice guidelines",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3245",
    year: 2024,
  },
  {
    id: 3,
    title: "Hip microinstability and its association with femoroacetabular impingement: A scoping review",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3063",
    year: 2024,
  },
  {
    id: 4,
    title: "Impact of direct access on the quality of primary care musculoskeletal physiotherapy: a scoping review from a patient, provider, and societal perspective",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3023",
    year: 2024,
  },
  {
    id: 5,
    title: "Pragmatism in manual therapy trials for knee osteoarthritis: a systematic review",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2916",
    year: 2024,
  },
  {
    id: 6,
    title: "Evolving trends in virtual reality rehabilitation for stroke in research publications",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3155",
    year: 2024,
  },
  {
    id: 7,
    title: "Effect of Pilates Exercises on Symptoms of Irritable Bowel Syndrome in Women: A Randomized Controlled Trial",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3228",
    year: 2024,
  },
  {
    id: 8,
    title: "Factors contributing to non-compliance with active physiotherapy guidelines among chronic low back pain patients in India",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3217",
    year: 2024,
  },
  {
    id: 9,
    title: "Adverse events related to physiotherapy practice: a scoping review",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3282",
    year: 2024,
  },
  {
    id: 10,
    title: "Does the modified shuttle test exhibit a ceiling effect in healthy and cystic fibrosis children and adolescents?",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3191",
    year: 2024,
  },
  {
    id: 11,
    title: "Perspectives, perceptions, and expectations of subjects with frozen shoulder: a web-based Italian survey",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3244",
    year: 2024,
  },
  {
    id: 12,
    title: "The Italian version of the Postural Assessment Scale for Stroke Patients (PASS): transcultural translation and validation",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3092",
    year: 2024,
  },
  {
    id: 13,
    title: "Indoor and outdoor 10-Meter Walk Test and Timed Up and Go in patients after total hip arthroplasty: a reliability and comparative study",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3267",
    year: 2024,
  },
  {
    id: 14,
    title: "Intra- and inter-rater reliability of goniometric finger range of motion using a written protocol",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3049",
    year: 2024,
  },
  {
    id: 15,
    title: "Neurological conditions and community-based physical activity: physical therapists' belief and actions",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2733",
    year: 2024,
  },
  {
    id: 16,
    title: "First-contact physiotherapists' perceived competency in a new model of care for low back pain patients: a mixed methods study",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3056",
    year: 2024,
  },
  {
    id: 17,
    title: "Defining the glenohumeral range of motion required for overhead shoulder mobility: an observational study",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3015",
    year: 2024,
  },
  {
    id: 18,
    title: "The psychometric properties of the modified fear of falling avoidance behavior questionnaire in Parkinson's disease and older adults",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2702",
    year: 2024,
  },
  {
    id: 19,
    title: "Treatment fidelity in clinical trials",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3128",
    year: 2024,
  },
  {
    id: 20,
    title: "Integrating spirituality into physical therapy: exploring its emerging role as a recognized determinant of health",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3370",
    year: 2024,
  },
  // 2023 (Vol. 13)
  {
    id: 21,
    title: "Rehabilitation after lumbar spine surgery in adults: a systematic review with meta-analysis",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2915",
    year: 2023,
  },
  {
    id: 22,
    title: "Reliability and measurement error of sensorimotor tests in patients with neck pain: a systematic review",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2910",
    year: 2023,
  },
  {
    id: 23,
    title: "Sex-specific differences in neuromuscular activation of the knee stabilizing muscles in adults: a systematic review",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2898",
    year: 2023,
  },
  {
    id: 24,
    title: "Implementation of community physiotherapy in primary care: one-year results of an on-call physiotherapy service",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/3012",
    year: 2023,
  },
  {
    id: 25,
    title: "Teaching evidence-based practice to physiotherapy students in Italy: a cross sectional study",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2914",
    year: 2023,
  },
  {
    id: 26,
    title: "Scientific approach and attitudes among clinically working physiotherapists in Sweden: a cross sectional survey",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2913",
    year: 2023,
  },
  {
    id: 27,
    title: "Empowerment and enablement and their associations with change in health-related quality of life after a supported osteoarthritis self-management programme",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2912",
    year: 2023,
  },
  {
    id: 28,
    title: "Does the painDETECT questionnaire identify impaired conditioned pain modulation in people with musculoskeletal pain? A diagnostic accuracy study",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2911",
    year: 2023,
  },
  {
    id: 29,
    title: "In-between duty and hope for recognition: the experience of physiotherapists working in a university hospital during the COVID-19 first wave in Switzerland",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2909",
    year: 2023,
  },
  {
    id: 30,
    title: "Rehabilitation following shoulder arthroplasty: a survey of current clinical practice patterns of Italian physiotherapists",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2906",
    year: 2023,
  },
  {
    id: 31,
    title: "Different muscle strategy during head/knee level of functional reaching-transporting task to decrease falling probability in postmenopausal women with osteoporosis",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2905",
    year: 2023,
  },
  {
    id: 32,
    title: "The sensitivity and specificity of using the McGill pain subscale for diagnosing neuropathic and non-neuropathic chronic pain in the total joint arthroplasty population",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2904",
    year: 2023,
  },
  {
    id: 33,
    title: "Virtual reality in the management of patients with low back and neck pain: a retrospective analysis of 82 people treated solely in the metaverse",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2903",
    year: 2023,
  },
  {
    id: 34,
    title: "Translation, cross-cultural adaptation and measurement properties of three implementation measures into Brazilian-Portuguese",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2900",
    year: 2023,
  },
  {
    id: 35,
    title: "Pulp-to-palm distance after plate fixation of a distal radius fracture corresponds to functional outcome",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2899",
    year: 2023,
  },
  {
    id: 36,
    title: "Views of physiotherapists on factors that play a role in ethical decision-making: an international online survey study",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2897",
    year: 2023,
  },
  {
    id: 37,
    title: "The five times sit-to-stand test: safety, validity and reliability with critical care survivors at ICU discharge",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2896",
    year: 2023,
  },
  {
    id: 38,
    title: "Patient's assessment and prediction of recovery after stroke: a roadmap for clinicians",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2907",
    year: 2023,
  },
  {
    id: 39,
    title: "The state of the art in telerehabilitation for musculoskeletal conditions",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2895",
    year: 2023,
  },
  {
    id: 40,
    title: "Cracking the code: unveiling the specific and shared mechanisms behind musculoskeletal interventions",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2908",
    year: 2023,
  },
  {
    id: 41,
    title: "\"Trustworthiness,\" confidence in estimated effects, and confidently translating research into clinical practice",
    url: "https://www.archivesofphysiotherapy.com/index.php/aop/article/view/2902",
    year: 2023,
  },
];

const years = ["All", "2024", "2023"];

export default function ArchivesPhysiotherapyPage() {
  const [selectedYear, setSelectedYear] = useState("All");

  const filteredArticles = selectedYear === "All"
    ? archivesOfPhysiotherapyArticles
    : archivesOfPhysiotherapyArticles.filter((article) => article.year === parseInt(selectedYear));

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <a href="/" className="hover:opacity-70">Home</a>
          <span>/</span>
          <span className="text-black">Archives of Physiotherapy</span>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4">
          Archives of Physiotherapy
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl">
          Open access journal for physiotherapy research. Source: Archives of Physiotherapy — CC BY 4.0
        </p>

        <div className="bg-green-100 text-green-800 text-sm font-bold px-4 py-2 rounded-lg inline-block mb-8">
          License: CC BY 4.0
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                selectedYear === year
                  ? "bg-black text-white"
                  : "bg-white text-black border border-gray-300 hover:bg-gray-100"
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        {filteredArticles.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-600 text-lg">
              No articles found in this year.
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
                  Vol. {article.year === 2024 ? "14" : "13"} ({article.year})
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
