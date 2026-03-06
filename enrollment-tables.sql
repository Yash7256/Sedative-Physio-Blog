-- Run this SQL in your Supabase SQL Editor to create the necessary tables

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  course_title TEXT NOT NULL,
  instructor TEXT,
  price INTEGER DEFAULT 0,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_queue table for sending invoices
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for enrollments (drop first for idempotency)
DROP POLICY IF EXISTS "Users can view own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Service role can manage enrollments" ON enrollments;

CREATE POLICY "Users can view own enrollments" ON enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage enrollments" ON enrollments
  USING (auth.role() = 'service_role');

-- Create policies for email_queue (drop first for idempotency)
DROP POLICY IF EXISTS "Service role can manage email_queue" ON email_queue;

CREATE POLICY "Service role can manage email_queue" ON email_queue
  USING (auth.role() = 'service_role');

-- Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);

-- Track per-user course progress
CREATE TABLE IF NOT EXISTS course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  course_id INTEGER NOT NULL,
  completed_lessons TEXT[] DEFAULT '{}',
  progress_percent INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT course_progress_user_course_unique UNIQUE (user_id, course_id)
);

ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

-- Allow learners to view and update their own progress (drop first for idempotency)
DROP POLICY IF EXISTS "Users can view own progress" ON course_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON course_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON course_progress;
DROP POLICY IF EXISTS "Service role can manage course_progress" ON course_progress;

CREATE POLICY "Users can view own progress" ON course_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON course_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON course_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role full access for background jobs/APIs
CREATE POLICY "Service role can manage course_progress" ON course_progress
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_course_progress_user_course ON course_progress(user_id, course_id);
