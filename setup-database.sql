-- Create blogs table for the blog management system
CREATE TABLE IF NOT EXISTS blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  tags TEXT[],
  author TEXT DEFAULT 'Admin',
  published BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reading_time INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs(published);
CREATE INDEX IF NOT EXISTS idx_blogs_featured ON blogs(featured);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_author ON blogs(author);

-- Enable Row Level Security
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to published blogs
CREATE POLICY IF NOT EXISTS "Public can view published blogs" 
ON blogs FOR SELECT 
USING (published = true);

-- Create policy for authenticated users to manage blogs
CREATE POLICY IF NOT EXISTS "Authenticated users can manage blogs" 
ON blogs FOR ALL 
USING (auth.role() = 'authenticated');

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_blogs_updated_at ON blogs;
CREATE TRIGGER update_blogs_updated_at 
    BEFORE UPDATE ON blogs 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Insert sample blog post to test the system
INSERT INTO blogs (title, slug, description, content, cover_image, tags, author, published, featured, reading_time)
VALUES 
(
  'Welcome to Your Blog',
  'welcome-to-your-blog',
  'This is your first blog post. Start writing amazing content!',
  '<p>Welcome to your new blog! This is a sample post to get you started.</p><p>You can edit this post or create new ones using the admin dashboard.</p>',
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
  ARRAY['welcome', 'introduction'],
  'Admin',
  true,
  true,
  1
)
ON CONFLICT (slug) DO NOTHING;