import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { courseId, numQuestions, difficulty, topics: selectedTopics } = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    let userId: string | null = null;

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('course_title')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    const { data: topics, error: topicsError } = await supabase
      .from('quiz_topics')
      .select('id, name, description')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (topicsError) {
      console.error('Failed to fetch quiz topics:', topicsError);
      return NextResponse.json(
        { error: 'Failed to load quiz topics' },
        { status: 500 }
      );
    }

    let attemptId = null;
    let syllabusData: Array<{ topic_name: string; content: string }> = [];

    if (selectedTopics && selectedTopics.length > 0 && numQuestions && difficulty) {
      const { data: syllabus, error: syllabusError } = await supabase
        .from('course_syllabus')
        .select('topic_name, content')
        .eq('course_id', courseId)
        .in('topic_name', selectedTopics);

      if (!syllabusError && syllabus) {
        syllabusData = syllabus;
      }

      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: userId,
          course_id: courseId,
          topics: selectedTopics,
          difficulty,
          num_questions: numQuestions,
          total_questions: 0,
          time_taken_seconds: 0,
          answers: [],
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!attemptError && attempt) {
        attemptId = attempt.id;
      }
    }

    return NextResponse.json({
      success: true,
      courseId,
      courseTitle: enrollment.course_title,
      topics: topics || [],
      maxQuestions: 50,
      attemptId,
      syllabusData,
    });
  } catch (error) {
    console.error('Quiz start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
