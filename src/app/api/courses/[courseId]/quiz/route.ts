import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import AIService from '../../../../../../ai-engine/aiService';

export const dynamic = 'force-dynamic';

interface Question {
  id: string;
  question: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  difficulty: string;
  topic: string;
}

interface QuizConfig {
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  courseTitle: string;
}

export async function POST(request: NextRequest) {
  try {
    const { courseId, numQuestions, difficulty, topics } = await request.json();

    if (!courseId || !numQuestions || !difficulty || !topics?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let userId: string | null = null;
    let userEmail: string | null = null;
    let supabase: ReturnType<typeof createServerClient> | null = null;

    if (supabaseUrl && supabaseAnonKey) {
      const cookieStore = await cookies();
      supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      });

      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
      userEmail = user?.email || null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
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

    const topicsList = topics.join(', ');

    const difficultyDescriptions = {
      easy: 'basic recall questions, definitions, simple concepts',
      medium: 'application-based questions, clinical scenarios, understanding of concepts',
      hard: 'complex clinical reasoning, analysis, synthesis, case-based questions'
    };

    const systemPrompt = `You are an expert medical/physiotherapy educator creating quiz questions. 
Generate high-quality multiple choice questions with 4 options each.
Ensure variety in question types: direct recall, clinical scenarios, image-based questions (describe the image), case studies, and concept application.
Return ONLY valid JSON in this exact format, no markdown or additional text:
{
  "questions": [
    {
      "id": "q1",
      "question": "The question text here",
      "options": [
        {"text": "Option A", "isCorrect": true},
        {"text": "Option B", "isCorrect": false},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
      ],
      "explanation": "Brief explanation of why the correct answer is correct",
      "difficulty": "easy/medium/hard",
      "topic": "Topic name"
    }
  ],
  "timeLimitMinutes": number
}
The time limit should be ${numQuestions} minutes for ${numQuestions} questions (1 minute per question).
Ensure exactly ${numQuestions} questions with good variety across: ${topicsList}`;

    const userMessage = `Create ${numQuestions} ${difficulty} difficulty quiz questions for the course "${enrollment.course_title}" covering topics: ${topicsList}.

Requirements:
- Difficulty: ${difficultyDescriptions[difficulty as keyof typeof difficultyDescriptions] || difficultyDescriptions.medium}
- Include varied question formats: direct recall, clinical scenarios, case studies, concept application
- Each question should have 4 options with only ONE correct answer
- Include a brief explanation for the correct answer
- Distribute questions evenly across all selected topics
- Make questions unique and not repetitive

Return ONLY the JSON response, no markdown formatting.`;

    const aiService = new AIService();
    const result = await aiService.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], 'llama-3.3-70b-versatile');

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate quiz' },
        { status: 500 }
      );
    }

    let quizData;
    try {
      const cleanedContent = result.data.replace(/```json\n?|```\n?/g, '').trim();
      quizData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', result.data);
      return NextResponse.json(
        { error: 'Failed to parse generated quiz' },
        { status: 500 }
      );
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        course_id: courseId,
        topics,
        difficulty,
        num_questions: numQuestions,
        total_questions: quizData.questions?.length || numQuestions,
        time_taken_seconds: 0,
        answers: quizData.questions,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Failed to save quiz attempt:', attemptError);
    }

    return NextResponse.json({
      success: true,
      attemptId: attempt?.id,
      questions: quizData.questions,
      timeLimitMinutes: quizData.timeLimitMinutes || numQuestions,
      courseId,
      difficulty,
      topics,
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
