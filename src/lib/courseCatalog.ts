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
  duration: string;
  coverImage: string;
  description: string;
  price: number;
  rating: number;
  students: string;
  isBestseller: boolean;
}

export interface CourseContent extends CourseOverview {
  sections: CourseSection[];
}

// Centralised catalog so UI and API share a single source of truth.
export const courseCatalog: CourseContent[] = [
  {
    id: 1,
    title: "Neuro Anatomy",
    instructor: "Dr. Akshay Kumar",
    duration: "12 Hours",
    coverImage: "https://i.ibb.co/F4bLdr2Q/Whats-App-Image-2026-02-28-at-9-14-27-PM.jpg",
    description: "Complete neuroanatomy course with detailed explanations and 3D demonstrations.",
    price: 0,
    rating: 4.9,
    students: "500+ Students",
    isBestseller: true,
    sections: [
      {
        title: "Introduction to Neuroanatomy",
        lessons: [
          {
            id: "lesson-1-1-1",
            title: "Basal Ganglia Affernet Connections",
            duration: "20 min 36 sec",
            type: "video",
            videoUrl: "https://www.youtube.com/embed/EmqDzL6FbSI",
          },
          {
            id: "lesson-1-1-2",
            title: "Basal Ganglia Anatomy",
            duration: "21 min 16 sec",
            type: "video",
            videoUrl: "https://www.youtube.com/embed/C91yU3AhixU",
          },
          {
            id: "lesson-1-1-3",
            title: "Functional Area Of Cerebral Cortex",
            duration: "27 min 27 sec",
            type: "video",
            videoUrl: "https://www.youtube.com/embed/G84g7zEffe4",
          },
          {
            id: "lesson-1-1-4",
            title: "Sulcus & Gyrus on Medical & Inferior Surface",
            duration: "23 min 32 sec",
            type: "video",
            videoUrl: "https://www.youtube.com/embed/5XxhhPyJ_7U",
          },
          {
            id: "lesson-1-1-5",
            title: "Cerebrum Part 1",
            duration: "25 min 32 sec",
            type: "video",
            videoUrl: "https://www.youtube.com/embed/5HxMaRzLUBI",
          },
        ],
      },
    ],
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
