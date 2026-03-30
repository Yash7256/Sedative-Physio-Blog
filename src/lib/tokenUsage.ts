import { supabaseAdmin } from '../../lib/supabaseServer';

interface TokenUsageResult {
  tokensUsed: number;
  tokensRemaining: number;
  windowResetAt: Date | null;
  hasPaid: boolean;
  isLimited: boolean;
}

interface CheckTokenResult {
  allowed: boolean;
  tokensUsed: number;
  tokensRemaining: number;
  windowResetAt: Date | null;
  hasPaid: boolean;
  message?: string;
}

const FREE_TOKEN_LIMIT = 15000;
const TOKEN_WINDOW_HOURS = 4;

export async function checkUserTokenUsage(userId: string): Promise<TokenUsageResult | null> {
  if (!supabaseAdmin) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('get_token_usage', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error checking token usage:', error);
      return null;
    }

    if (data && data.length > 0) {
      return {
        tokensUsed: data[0].tokens_used || 0,
        tokensRemaining: data[0].tokens_remaining || FREE_TOKEN_LIMIT,
        windowResetAt: data[0].window_reset_at ? new Date(data[0].window_reset_at) : null,
        hasPaid: data[0].has_paid || false,
        isLimited: data[0].is_limited || false
      };
    }

    return {
      tokensUsed: 0,
      tokensRemaining: FREE_TOKEN_LIMIT,
      windowResetAt: null,
      hasPaid: false,
      isLimited: false
    };
  } catch (err) {
    console.error('Token usage check error:', err);
    return null;
  }
}

export async function recordAndCheckToken(
  userId: string,
  tokensToUse: number
): Promise<CheckTokenResult> {
  if (!supabaseAdmin) {
    return {
      allowed: true,
      tokensUsed: 0,
      tokensRemaining: Infinity,
      windowResetAt: null,
      hasPaid: true,
      message: 'Token tracking not configured'
    };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('record_token_usage', {
      p_user_id: userId,
      p_tokens: tokensToUse
    });

    if (error) {
      console.error('Error recording token usage:', error);
      return {
        allowed: true,
        tokensUsed: 0,
        tokensRemaining: FREE_TOKEN_LIMIT,
        windowResetAt: null,
        hasPaid: false,
        message: 'Error checking limits, allowing request'
      };
    }

    if (data && data.length > 0) {
      const result = data[0];
      const hasPaid = result.has_paid;
      const isLimited = result.is_limited;

      if (hasPaid) {
        return {
          allowed: true,
          tokensUsed: result.tokens_used || 0,
          tokensRemaining: Infinity,
          windowResetAt: null,
          hasPaid: true,
          message: 'Premium user - unlimited access'
        };
      }

      if (isLimited) {
        const windowEnd = new Date();
        windowEnd.setHours(windowEnd.getHours() + (TOKEN_WINDOW_HOURS - (windowEnd.getHours() % TOKEN_WINDOW_HOURS)));
        
        return {
          allowed: false,
          tokensUsed: result.tokens_used || 0,
          tokensRemaining: result.tokens_remaining || 0,
          windowResetAt: windowEnd,
          hasPaid: false,
          message: `Daily token limit reached. Your ${FREE_TOKEN_LIMIT.toLocaleString()} tokens will reset in ${TOKEN_WINDOW_HOURS} hours. Upgrade to premium for unlimited access!`
        };
      }

      return {
        allowed: true,
        tokensUsed: result.tokens_used || 0,
        tokensRemaining: result.tokens_remaining || 0,
        windowResetAt: null,
        hasPaid: false,
        message: `${result.tokens_remaining?.toLocaleString() || 0} tokens remaining today`
      };
    }

    return {
      allowed: true,
      tokensUsed: 0,
      tokensRemaining: FREE_TOKEN_LIMIT,
      windowResetAt: null,
      hasPaid: false
    };
  } catch (err) {
    console.error('Record token error:', err);
    return {
      allowed: true,
      tokensUsed: 0,
      tokensRemaining: FREE_TOKEN_LIMIT,
      windowResetAt: null,
      hasPaid: false,
      message: 'Error checking limits, allowing request'
    };
  }
}

export function getTokenLimitInfo() {
  return {
    freeLimit: FREE_TOKEN_LIMIT,
    windowHours: TOKEN_WINDOW_HOURS,
    windowResetText: `Resets every ${TOKEN_WINDOW_HOURS} hours`
  };
}
