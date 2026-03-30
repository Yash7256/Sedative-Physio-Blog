import { NextRequest, NextResponse } from 'next/server';
import AIService from '../../../../../ai-engine/aiService';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { recordAndCheckToken, getTokenLimitInfo } from '@/lib/tokenUsage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { messages, model = "llama-3.1-8b-instant" } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let userId: string | null = null;

    if (supabaseUrl && supabaseAnonKey) {
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
    }

    const estimatedTokens = estimateTokenCount(messages);
    const tokenCheck = await recordAndCheckToken(userId || 'anonymous', estimatedTokens);

    if (!tokenCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Token limit exceeded',
          message: tokenCheck.message,
          tokensUsed: tokenCheck.tokensUsed,
          tokensRemaining: tokenCheck.tokensRemaining,
          windowResetAt: tokenCheck.windowResetAt,
          hasPaid: tokenCheck.hasPaid,
          limitInfo: getTokenLimitInfo()
        },
        { status: 429 }
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
      usage: result.usage,
      tokenInfo: {
        tokensUsed: tokenCheck.tokensUsed,
        tokensRemaining: tokenCheck.tokensRemaining,
        hasPaid: tokenCheck.hasPaid,
        limitInfo: getTokenLimitInfo()
      }
    });
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function estimateTokenCount(messages: Array<{ role: string; content: string }>): number {
  let totalChars = 0;
  for (const msg of messages) {
    totalChars += (msg.content || '').length;
  }
  return Math.ceil(totalChars / 4);
}
