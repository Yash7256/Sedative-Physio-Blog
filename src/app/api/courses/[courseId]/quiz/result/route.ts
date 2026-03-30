import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import AIService from '../../../../../../../ai-engine/aiService';

export const dynamic = 'force-dynamic';

interface QuizAnswer {
  id: string;
  question: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  topic: string;
  difficulty: string;
  userAnswer?: number;
  timeSpent?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { attemptId, courseTitle, topics } = await request.json();

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Attempt ID is required' },
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

    const answers: QuizAnswer[] = attempt.answers || [];
    let score = 0;
    const totalQuestions = answers.length;

    answers.forEach((answer) => {
      const correctIndex = answer.options.findIndex(opt => opt.isCorrect);
      if (answer.userAnswer === correctIndex) {
        score++;
      }
    });

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const passed = percentage >= 60;

    const aiService = new AIService();
    const result = await aiService.generateQuizSummary(
      answers.map(a => ({
        question: a.question,
        userAnswer: a.userAnswer ?? -1,
        correctAnswer: a.options.findIndex(opt => opt.isCorrect),
        options: a.options,
        explanation: a.explanation,
        topic: a.topic,
        difficulty: a.difficulty
      })),
      courseTitle || attempt.topics?.join(', ') || 'Quiz',
      topics || attempt.topics || []
    );

    let summaryData: any = null;
    if (result.success) {
      try {
        const cleanedContent = result.data.replace(/```json\n?|```\n?/g, '').trim();
        summaryData = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('Failed to parse summary:', result.data);
      }
    }

    await supabase
      .from('quiz_attempts')
      .update({
        score,
        total_questions: totalQuestions,
        passed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', attemptId);

    return NextResponse.json({
      success: true,
      attemptId,
      score,
      totalQuestions,
      percentage,
      passed,
      timeTaken: attempt.time_taken_seconds || 0,
      summary: summaryData,
      detailedResults: answers.map((a, i) => ({
        questionNumber: i + 1,
        question: a.question,
        options: a.options,
        userAnswer: a.userAnswer,
        correctAnswer: a.options.findIndex(opt => opt.isCorrect),
        isCorrect: a.userAnswer === a.options.findIndex(opt => opt.isCorrect),
        explanation: a.explanation,
        topic: a.topic,
        difficulty: a.difficulty
      }))
    });
  } catch (error) {
    console.error('Quiz result error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
