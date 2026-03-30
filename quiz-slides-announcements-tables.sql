-- Run this SQL in your Supabase SQL Editor to create quiz, slides, and announcements tables

-- Quiz Topics table (for selecting topics in quizzes)
CREATE TABLE IF NOT EXISTS quiz_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Attempts (to track quiz history per user)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id INTEGER NOT NULL,
  topics TEXT[] NOT NULL,
  difficulty TEXT NOT NULL,
  num_questions INTEGER NOT NULL,
  score INTEGER,
  total_questions INTEGER,
  time_taken_seconds INTEGER,
  passed BOOLEAN,
  answers JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course Slides table
CREATE TABLE IF NOT EXISTS course_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'image',
  day_number INTEGER,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE quiz_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Quiz Topics policies
DROP POLICY IF EXISTS "Users can view quiz topics" ON quiz_topics;
DROP POLICY IF EXISTS "Service role can manage quiz_topics" ON quiz_topics;

CREATE POLICY "Users can view quiz topics" ON quiz_topics
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage quiz_topics" ON quiz_topics
  USING (auth.role() = 'service_role');

-- Quiz Attempts policies
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can update own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Service role can manage quiz_attempts" ON quiz_attempts;

CREATE POLICY "Users can view own quiz attempts" ON quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz attempts" ON quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage quiz_attempts" ON quiz_attempts
  USING (auth.role() = 'service_role');

-- Course Slides policies
DROP POLICY IF EXISTS "Users can view course slides" ON course_slides;
DROP POLICY IF EXISTS "Service role can manage course_slides" ON course_slides;

CREATE POLICY "Users can view course slides" ON course_slides
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage course_slides" ON course_slides
  USING (auth.role() = 'service_role');

-- Announcements policies
DROP POLICY IF EXISTS "Users can view announcements" ON announcements;
DROP POLICY IF EXISTS "Service role can manage announcements" ON announcements;

CREATE POLICY "Users can view announcements" ON announcements
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage announcements" ON announcements
  USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_topics_course_id ON quiz_topics(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course_id ON quiz_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_course_slides_course_id ON course_slides(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_course_id ON announcements(course_id);

-- Insert sample quiz topics for Orthopedics Batch (course_id: 1)
INSERT INTO quiz_topics (course_id, name, description, order_index) VALUES
(1, 'Fracture Introduction', 'Types of fractures and healing process', 1),
(1, 'Upper Limb Fractures', 'Humerus, scapula, clavicle, radius, ulna', 2),
(1, 'Lower Limb Fractures', 'Hip bone, femur, tibia, fibula', 3),
(1, 'Bone Infections', 'Osteomyelitis, bone TB, septic arthritis', 4),
(1, 'Metabolic Disorders', 'Osteoporosis, osteomalacia, rickets, fluorosis', 5),
(1, 'Bone Tumors', 'Benign and malignant tumors', 6),
(1, 'Congenital Cases', 'CTEV, poliomyelitis', 7),
(1, 'Joint Replacements', 'TKR, ACL reconstruction', 8),
(1, 'Arthritis', 'Osteoarthritis, rheumatoid arthritis, gout', 9);
