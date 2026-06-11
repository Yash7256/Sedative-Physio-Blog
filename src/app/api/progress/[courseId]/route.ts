import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";
import { getCourseById, getCourseLessonIds } from "@/lib/courseCatalog";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sendCompletionEmail = async (
  to: string,
  courseTitle: string,
  courseUrl: string
) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const completedOn = new Date().toISOString().split("T")[0];

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111;">
    <div style="background:#111;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="margin:0;">Sedative Physio</h1>
      <p style="margin:6px 0 0;">Course Completion</p>
    </div>
    <div style="background:#f7f7f7;padding:24px;border-radius:0 0 12px 12px;">
      <p>Congratulations!</p>
      <p>You have successfully completed <strong>${courseTitle}</strong> on <strong>${completedOn}</strong>.</p>
      <p style="margin:18px 0;">Keep a copy of this email for your records. You can revisit the course anytime:</p>
      <p><a href="${courseUrl}" style="background:#111;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">View Course</a></p>
      <p style="margin-top:24px;color:#666;font-size:12px;">If you believe this was sent in error, please contact support.</p>
    </div>
  </div>
  `;

  await transporter.sendMail({
    from: `"Sedative Physio" <${process.env.EMAIL_USER}>`,
    to,
    subject: `You completed ${courseTitle}!`,
    html,
  });
};

const createSupabaseClient = (request: NextRequest) => {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
      },
    },
  });
};

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = Number(params.courseId);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase service role not configured" },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseAnonKey || Number.isNaN(courseId)) {
      return NextResponse.json(
        { error: "Invalid configuration or course id" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient(request);

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = user.id;

    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    const { data: progress, error: progressError } = await supabaseAdmin
      .from("course_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (progressError) {
      if (progressError.code === "PGRST205") {
        return NextResponse.json(
          { error: "course_progress table not found. Run enrollment-tables.sql in Supabase and refresh the schema cache." },
          { status: 500 }
        );
      }
      console.error("Progress fetch error:", progressError);
      return NextResponse.json(
        { error: "Failed to fetch progress" },
        { status: 500 }
      );
    }

    const course = await getCourseById(String(courseId));
    const totalLessons = course ? getCourseLessonIds(course).length : 0;
    const completedLessons = progress?.completed_lessons || [];
    const progressPercent =
      totalLessons === 0
        ? 0
        : Math.min(
            100,
            Math.round((completedLessons.length / totalLessons) * 100)
          );

    return NextResponse.json({
      success: true,
      progress: {
        completedLessons,
        progressPercent,
        completed: progress?.completed ?? false,
      },
    });
  } catch (error) {
    console.error("Progress GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = Number(params.courseId);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase service role not configured" },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseAnonKey || Number.isNaN(courseId)) {
      return NextResponse.json(
        { error: "Invalid configuration or course id" },
        { status: 400 }
      );
    }

    const course = await getCourseById(String(courseId));

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { lessonId, completed } = body as {
      lessonId?: string;
      completed?: boolean;
    };

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 }
      );
    }

    const validLessonIds = course ? getCourseLessonIds(course) : [];

    if (!validLessonIds.includes(lessonId)) {
      return NextResponse.json(
        { error: "Invalid lesson for this course" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient(request);

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const userEmail = user.email || undefined;

    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    const { data: existingProgress, error: fetchError } = await supabaseAdmin
      .from("course_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (fetchError) {
      if (fetchError.code === "PGRST205") {
        return NextResponse.json(
          { error: "course_progress table not found. Run enrollment-tables.sql in Supabase and refresh the schema cache." },
          { status: 500 }
        );
      }
      console.error("Progress fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to load existing progress" },
        { status: 500 }
      );
    }

    const lessonSet = new Set(existingProgress?.completed_lessons || []);

    if (completed === false) {
      lessonSet.delete(lessonId);
    } else {
      lessonSet.add(lessonId);
    }

    const totalLessons = validLessonIds.length;
    const progressPercent =
      totalLessons === 0
        ? 0
        : Math.min(
            100,
            Math.round((lessonSet.size / totalLessons) * 100)
          );

    const isCompleted = progressPercent >= 100;
    const shouldSendCompletionEmail =
      isCompleted && !existingProgress?.completed;

    const now = new Date().toISOString();

    const { data: upserted, error: upsertError } = await supabaseAdmin
      .from("course_progress")
      .upsert(
        {
          user_id: userId,
          user_email: userEmail,
          course_id: courseId,
          completed_lessons: Array.from(lessonSet),
          progress_percent: progressPercent,
          completed: isCompleted,
          completed_at: isCompleted
            ? existingProgress?.completed_at || now
            : null,
          updated_at: now,
        },
        { onConflict: "user_id,course_id" }
      )
      .select()
      .maybeSingle();

    if (upsertError) {
      if (upsertError.code === "PGRST205") {
        return NextResponse.json(
          { error: "course_progress table not found. Run enrollment-tables.sql in Supabase and refresh the schema cache." },
          { status: 500 }
        );
      }
      console.error("Progress upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to update progress" },
        { status: 500 }
      );
    }

    if (shouldSendCompletionEmail && userEmail) {
      const courseUrl =
        process.env.NEXT_PUBLIC_BASE_URL
          ? `${process.env.NEXT_PUBLIC_BASE_URL}/courses/${courseId}`
          : `${request.nextUrl.origin}/courses/${courseId}`;

      try {
        await sendCompletionEmail(userEmail, course.title, courseUrl);
      } catch (emailError) {
        console.error("Completion email error:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      progress: {
        completedLessons: upserted?.completed_lessons || Array.from(lessonSet),
        progressPercent,
        completed: isCompleted,
      },
    });
  } catch (error) {
    console.error("Progress PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
