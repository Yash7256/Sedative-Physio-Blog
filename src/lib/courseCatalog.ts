export type LessonType = "video" | "pdf";

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  type: LessonType;
  videoUrl?: string;
  pdfUrl?: string;
}

export interface CourseSection {
  title: string;
  lessons: CourseLesson[];
}

export interface CourseOverview {
  id: number;
  title: string;
  instructor: string;
  instructorImage?: string;
  duration: string;
  coverImage: string;
  description: string;
  price: number;
  rating: number;
  students: string;
  isBestseller: boolean;
  topicsIncluded?: string[];
  batchHighlights?: string[];
  sectionsToDiscuss?: string[];
  batchStartDate?: string;
  batchTime?: string;
  language?: string;
  accessType?: string;
}

export interface CourseContent extends CourseOverview {
  sections: CourseSection[];
}

// Centralised catalog so UI and API share a single source of truth.
export const courseCatalog: CourseContent[] = [
  {
    id: 3,
    title: "Orthopedics Batch",
    instructor: "Dr. Akshay Kumar PT",
    duration: "Live Batch",
    coverImage: "",
    instructorImage: "https://jibonryxreoezswvydnd.supabase.co/storage/v1/object/public/images/WhatsApp%20Image%202026-01-19%20at%2011.57.21%20PM.jpeg",
    description: "Comprehensive orthopedics course covering fractures, infections, metabolic disorders, bone tumors, congenital cases, surgeries, and joint disorders.",
    price: 1,
    rating: 0,
    students: "0 Students",
    isBestseller: true,
    topicsIncluded: [
      "Fracture - Introduction, Types & Fracture Healing",
      "Fractures of Upper Limb (Humerus, Scapula, Clavicle, Radius & Ulna)",
      "Fractures of Lower Limb (Hip Bone, Femur, Tibia & Fibula)",
      "Bone infections - Osteomyelitis, Bone TB, Septic Arthritis",
      "Metabolic Disorders - Osteomalacia, Osteoporosis, Rickets, Fluorosis",
      "Bone Tumors - Benign & Malignant (Osteoid Osteoma, Osteoclastoma, Metastasis in Bone)",
      "Congenital Cases - CTEV, Poliomyelitis",
      "Surgeries - TKR, ACL Reconstruction",
      "Joint Disorders - OA, RA, Gout",
    ],
    batchHighlights: [
      "Live Lectures",
      "All the Live lectures will be recorded simultaneously & it can be accessible for lifetime",
      "Notes & Slides will be provided",
      "Doubt sessions",
      "MCQs for practice will be given",
      "Language - English & Hindi",
      "Access will be given through google drive",
    ],
    sectionsToDiscuss: [
      "Introduction",
      "Relevant & Patho anatomy",
      "Etiology",
      "Clinical Manifestations",
      "Radiological Interpretation",
      "Medical & Surgical Management",
      "Physiotherapy Management",
    ],
    batchStartDate: "13 April 2026",
    batchTime: "9 pm to 10 pm",
    language: "English & Hindi",
    accessType: "Google Drive",
    sections: [],
  },
];

export const getCourseById = (id: number): CourseContent | undefined =>
  courseCatalog.find((course) => course.id === id);

export const getCourseLessonIds = (id: number): string[] => {
  const course = getCourseById(id);
  if (!course) return [];
  return course.sections.flatMap((section) => section.lessons.map((lesson) => lesson.id));
};

export const getCourseSummaries = (): CourseOverview[] =>
  courseCatalog.map(({ sections, ...summary }) => summary);
