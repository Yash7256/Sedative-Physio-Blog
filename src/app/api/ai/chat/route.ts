import { NextRequest, NextResponse } from 'next/server';
import AIService from '../../../../../ai-engine/aiService';

export async function POST(request: NextRequest) {
  try {
    const { messages, model = "llama-3.1-8b-instant" } = await request.json(); // Updated default model
    
    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const aiService = new AIService();
    const result = await aiService.chatCompletion(messages, model);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      model: result.model,
      usage: result.usage
    });
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}