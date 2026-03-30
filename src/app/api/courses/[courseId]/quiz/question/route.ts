import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import AIService from '../../../../../../../ai-engine/aiService';

export const dynamic = 'force-dynamic';

interface QuizQuestion {
  id: string;
  question: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  topic: string;
  difficulty: string;
  correctAnswer?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { courseId, attemptId, questionNumber, totalQuestions, topicName, syllabusContent, previousTopics, difficulty } = await request.json();

    if (!courseId || !attemptId || !questionNumber || !totalQuestions || !topicName || !syllabusContent) {
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
      .select('user_id')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (!attempt) {
      return NextResponse.json(
        { error: 'Quiz attempt not found' },
        { status: 404 }
      );
    }

    const aiService = new AIService();
    const result = await aiService.generateQuizQuestion(
      syllabusContent,
      topicName,
      questionNumber,
      totalQuestions,
      previousTopics
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate question' },
        { status: 500 }
      );
    }

    let questionData: QuizQuestion;
    try {
      const cleanedContent = result.data.replace(/```json\n?|```\n?/g, '').trim();
      questionData = JSON.parse(cleanedContent);

      const correctIndex = questionData.correctAnswer;
      questionData.options = questionData.options.map((opt, idx) => ({
        text: opt.text,
        isCorrect: idx === correctIndex
      }));
      delete (questionData as any).correctAnswer;

    } catch (parseError) {
      console.error('Failed to parse AI response:', result.data);
      return NextResponse.json(
        { error: 'Failed to parse generated question' },
        { status: 500 }
      );
    }

    const { data: existingAnswers } = await supabase
      .from('quiz_attempts')
      .select('answers')
      .eq('id', attemptId)
      .single();

    const currentAnswers = existingAnswers?.answers || [];
    currentAnswers.push(questionData);

    await supabase
      .from('quiz_attempts')
      .update({ answers: currentAnswers })
      .eq('id', attemptId);

    const aiService2 = new AIService();
    const timeLimit = aiService2.calculateTimeLimit(totalQuestions, difficulty || 'medium');

    return NextResponse.json({
      success: true,
      question: questionData,
      questionNumber,
      totalQuestions,
      timeLimitMinutes: timeLimit,
    });
  } catch (error) {
    console.error('Quiz question error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
