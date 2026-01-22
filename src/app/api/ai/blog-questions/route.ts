import { NextRequest, NextResponse } from 'next/server';
import AIService from '../../../../../ai-engine/aiService';

export async function POST(request: NextRequest) {
  try {
    const { question, blogContent, model = "llama-3.1-8b-instant" } = await request.json(); // Updated default model
    
    // Validate input
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required and must be a string' },
        { status: 400 }
      );
    }

    if (!blogContent || typeof blogContent !== 'string') {
      return NextResponse.json(
        { error: 'Blog content is required and must be a string' },
        { status: 400 }
      );
    }

    const aiService = new AIService();
    const result = await aiService.answerBlogQuestions(question, blogContent, model);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      answer: result.data
    });
  } catch (error) {
    console.error('AI Blog Questions API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}