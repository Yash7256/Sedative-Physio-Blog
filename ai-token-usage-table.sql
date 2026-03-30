-- AI Token Usage Tracking Table
-- Tracks token usage per user for rate limiting free users

CREATE TABLE IF NOT EXISTS ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, window_start)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user_id ON ai_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_window ON ai_token_usage(window_start);

-- Function to check if user has any paid enrollment
CREATE OR REPLACE FUNCTION check_user_has_paid_course(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_paid BOOLEAN;
BEGIN
  -- Check if user has any enrollment with a paid course (price > 0)
  SELECT EXISTS(
    SELECT 1 
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.user_id = p_user_id 
    AND c.price > 0
  ) INTO has_paid;
  
  RETURN COALESCE(has_paid, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record token usage
CREATE OR REPLACE FUNCTION record_token_usage(
  p_user_id UUID,
  p_tokens INTEGER
)
RETURNS TABLE(
  tokens_used INTEGER,
  tokens_remaining INTEGER,
  is_limited BOOLEAN,
  has_paid BOOLEAN
) AS $$
DECLARE
  v_tokens_used INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_is_limited BOOLEAN;
  v_has_paid BOOLEAN;
  v_tokens_remaining INTEGER;
  v_max_tokens INTEGER := 15000; -- Free users get 15,000 tokens per window
  v_window_hours INTEGER := 4; -- Reset after 4 hours
BEGIN
  -- Check if user has paid course
  SELECT check_user_has_paid_course(p_user_id) INTO v_has_paid;
  
  -- If paid user, no limit
  IF v_has_paid THEN
    RETURN QUERY SELECT 0, 0, FALSE, TRUE;
    RETURN;
  END IF;
  
  -- Get or create current window
  v_window_start := DATE_TRUNC('hour', NOW()) - (EXTRACT(HOUR FROM NOW()) % v_window_hours) * INTERVAL '1 hour';
  
  -- Get current usage
  SELECT COALESCE(SUM(tokens_used), 0)
  INTO v_tokens_used
  FROM ai_token_usage
  WHERE user_id = p_user_id
  AND window_start >= v_window_start;
  
  -- Calculate remaining
  v_tokens_remaining := GREATEST(0, v_max_tokens - v_tokens_used - p_tokens);
  v_is_limited := (v_tokens_used + p_tokens) > v_max_tokens;
  
  -- If not limited, record usage
  IF NOT v_is_limited THEN
    INSERT INTO ai_token_usage (user_id, tokens_used, window_start)
    VALUES (p_user_id, p_tokens, v_window_start)
    ON CONFLICT (user_id, window_start)
    DO UPDATE SET 
      tokens_used = ai_token_usage.tokens_used + EXCLUDED.tokens_used,
      updated_at = NOW();
  END IF;
  
  RETURN QUERY SELECT v_tokens_used + p_tokens, v_tokens_remaining, v_is_limited, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current token usage
CREATE OR REPLACE FUNCTION get_token_usage(p_user_id UUID)
RETURNS TABLE(
  tokens_used INTEGER,
  tokens_remaining INTEGER,
  window_reset_at TIMESTAMP WITH TIME ZONE,
  has_paid BOOLEAN,
  is_limited BOOLEAN
) AS $$
DECLARE
  v_tokens_used INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_has_paid BOOLEAN;
  v_max_tokens INTEGER := 15000;
  v_window_hours INTEGER := 4;
BEGIN
  -- Check if user has paid course
  SELECT check_user_has_paid_course(p_user_id) INTO v_has_paid;
  
  IF v_has_paid THEN
    RETURN QUERY SELECT 0, 0, NOW(), TRUE, FALSE;
    RETURN;
  END IF;
  
  -- Calculate window start
  v_window_start := DATE_TRUNC('hour', NOW()) - (EXTRACT(HOUR FROM NOW()) % v_window_hours) * INTERVAL '1 hour';
  
  -- Get current usage
  SELECT COALESCE(SUM(tokens_used), 0)
  INTO v_tokens_used
  FROM ai_token_usage
  WHERE user_id = p_user_id
  AND window_start >= v_window_start;
  
  RETURN QUERY SELECT 
    v_tokens_used,
    GREATEST(0, v_max_tokens - v_tokens_used),
    v_window_start + (v_window_hours || ' hours')::INTERVAL,
    FALSE,
    v_tokens_used >= v_max_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
