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
  id: string;
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

// Fetch courses from the database
export const fetchCourses = async (): Promise<CourseOverview[]> => {
  try {
    const response = await fetch("/api/courses");
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data.map((course: any) => ({
        id: course.id,
        title: course.title,
        instructor: course.instructor,
        instructorImage: course.instructor_image,
        duration: course.duration,
        coverImage: course.cover_image,
        description: course.description,
        price: course.price,
        rating: course.rating,
        students: course.students || "0 Students",
        isBestseller: course.is_bestseller,
        topicsIncluded: course.topics_included,
        batchHighlights: course.batch_highlights,
        sectionsToDiscuss: course.sections_to_discuss,
        batchStartDate: course.batch_start_date,
        batchTime: course.batch_time,
        language: course.language,
        accessType: course.access_type,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
};

export const getCourseById = async (id: string): Promise<CourseContent | undefined> => {
  try {
    const response = await fetch(`/api/courses/${id}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const course = result.data;
      return {
        id: course.id,
        title: course.title,
        instructor: course.instructor,
        instructorImage: course.instructor_image,
        duration: course.duration,
        coverImage: course.cover_image,
        description: course.description,
        price: course.price,
        rating: course.rating,
        students: course.students || "0 Students",
        isBestseller: course.is_bestseller,
        topicsIncluded: course.topics_included,
        batchHighlights: course.batch_highlights,
        sectionsToDiscuss: course.sections_to_discuss,
        batchStartDate: course.batch_start_date,
        batchTime: course.batch_time,
        language: course.language,
        accessType: course.access_type,
        sections: [],
      };
    }
    return undefined;
  } catch (error) {
    console.error("Error fetching course:", error);
    return undefined;
  }
};

export const getCourseLessonIds = (course: CourseContent): string[] => {
  return course.sections.flatMap((section) => section.lessons.map((lesson) => lesson.id));
};

export const getCourseSummaries = async (): Promise<CourseOverview[]> => {
  return await fetchCourses();
};
