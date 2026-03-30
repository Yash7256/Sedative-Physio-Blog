import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { attemptId, questionIndex, selectedOption, timeSpent } = await request.json();

    if (!attemptId || questionIndex === undefined || selectedOption === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (!attempt) {
      return NextResponse.json(
        { error: 'Quiz attempt not found' },
        { status: 404 }
      );
    }

    const answers = attempt.answers || [];
    if (answers[questionIndex]) {
      answers[questionIndex].userAnswer = selectedOption;
      answers[questionIndex].timeSpent = timeSpent || 0;
    }

    const totalTimeTaken = (attempt.time_taken_seconds || 0) + (timeSpent || 0);

    await supabase
      .from('quiz_attempts')
      .update({ 
        answers,
        time_taken_seconds: totalTimeTaken
      })
      .eq('id', attemptId);

    return NextResponse.json({
      success: true,
      message: 'Answer submitted'
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
