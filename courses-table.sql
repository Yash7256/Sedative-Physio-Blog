-- Courses table for managing course information
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  instructor TEXT NOT NULL,
  instructor_image TEXT,
  duration TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  students TEXT DEFAULT '0 Students',
  is_bestseller BOOLEAN DEFAULT FALSE,
  topics_included TEXT[],
  batch_highlights TEXT[],
  sections_to_discuss TEXT[],
  batch_start_date TEXT,
  batch_time TEXT,
  language TEXT,
  access_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Course policies
DROP POLICY IF EXISTS "Users can view courses" ON courses;
DROP POLICY IF EXISTS "Service role can manage courses" ON courses;

CREATE POLICY "Users can view courses" ON courses
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage courses" ON courses
  USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_title ON courses(title);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor);
CREATE INDEX IF NOT EXISTS idx_courses_is_bestseller ON courses(is_bestseller);

-- Insert sample course (Orthopedics Batch)
INSERT INTO courses (
  title,
  instructor,
  instructor_image,
  duration,
  cover_image,
  description,
  price,
  rating,
  students,
  is_bestseller,
  topics_included,
  batch_highlights,
  sections_to_discuss,
  batch_start_date,
  batch_time,
  language,
  access_type
) VALUES (
  'Orthopedics Batch',
  'Dr. Akshay Kumar PT',
  'https://jibonryxreoezswvydnd.supabase.co/storage/v1/object/public/images/WhatsApp%20Image%202026-01-19%20at%2011.57.21%20PM.jpeg',
  'Live Batch',
  '',
  'Comprehensive orthopedics course covering fractures, infections, metabolic disorders, bone tumors, congenital cases, surgeries, and joint disorders.',
  1200,
  0,
  '0 Students',
  true,
  ARRAY[
    'Fracture - Introduction, Types & Fracture Healing',
    'Fractures of Upper Limb (Humerus, Scapula, Clavicle, Radius & Ulna)',
    'Fractures of Lower Limb (Hip Bone, Femur, Tibia & Fibula)',
    'Bone infections - Osteomyelitis, Bone TB, Septic Arthritis',
    'Metabolic Disorders - Osteomalacia, Osteoporosis, Rickets, Fluorosis',
    'Bone Tumors - Benign & Malignant (Osteoid Osteoma, Osteoclastoma, Metastasis in Bone)',
    'Congenital Cases - CTEV, Poliomyelitis',
    'Surgeries - TKR, ACL Reconstruction',
    'Joint Disorders - OA, RA, Gout'
  ],
  ARRAY[
    'Live Lectures',
    'All the Live lectures will be recorded simultaneously & it can be accessible for lifetime',
    'Notes & Slides will be provided',
    'Doubt sessions',
    'MCQs for practice will be given',
    'Language - English & Hindi',
    'Access will be given through google drive'
  ],
  ARRAY[
    'Introduction',
    'Relevant & Patho anatomy',
    'Etiology',
    'Clinical Manifestations',
    'Radiological Interpretation',
    'Medical & Surgical Management',
    'Physiotherapy Management'
  ],
  '13 April 2026',
  '9 pm to 10 pm',
  'English & Hindi',
  'Google Drive'
);
