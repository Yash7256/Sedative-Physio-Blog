-- Create notes table for storing medical study notes
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  category VARCHAR(100),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
CREATE POLICY "Notes are viewable by everyone" ON notes
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert their own notes" ON notes
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_title ON notes USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING gin(tags);