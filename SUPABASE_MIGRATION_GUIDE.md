# Migration from MongoDB to Supabase

This document outlines the steps required to migrate from MongoDB to Supabase for the blog management system.

## 1. Environment Variables

Update your `.env.local` file with Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Cloudinary Configuration (optional - for cloud image storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Other configurations
NODE_ENV=development
```

## 2. Database Schema

Create the `blogs` table in Supabase with the following SQL:

```sql
CREATE TABLE blogs (
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

-- Create indexes
CREATE INDEX idx_blogs_slug ON blogs(slug);
CREATE INDEX idx_blogs_published ON blogs(published);
CREATE INDEX idx_blogs_featured ON blogs(featured);
CREATE INDEX idx_blogs_created_at ON blogs(created_at);
```

## 3. Key Changes Made

### API Routes
- Replaced MongoDB/Mongoose operations with Supabase client operations
- Updated data fetching and manipulation to use Supabase queries
- Maintained the same API endpoints for compatibility

### Data Model
- Replaced Mongoose schema with TypeScript interface
- Updated field names to follow PostgreSQL conventions (e.g., `coverImage` → `cover_image`)
- Maintained all essential blog post properties

### Admin Panel
- Updated to work with Supabase data structure
- Maintained all CRUD functionality
- Kept rich text editor and image upload features

### Blog Pages
- Updated to fetch data from Supabase via API routes
- Maintained all display functionality
- Preserved SEO and metadata handling

## 4. Supabase Storage (Optional Enhancement)

For production use, consider implementing Supabase Storage for image uploads:

1. Enable Storage in your Supabase dashboard
2. Create a bucket named `blog-images`
3. Update the upload route to use Supabase Storage instead of data URLs
4. Configure RLS policies for the storage bucket

## 5. Running the Application

1. Install dependencies: `npm install`
2. Set up environment variables as described above
3. Create the database tables as described above
4. Run the application: `npm run dev`

## 6. Data Migration

To migrate existing MongoDB data to Supabase:

1. Export your MongoDB data to JSON
2. Transform the data to match the Supabase schema
3. Insert the data into Supabase using bulk insert operations

Example migration script:

```typescript
// scripts/migrate-data.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateData() {
  const blogData = JSON.parse(fs.readFileSync('./blog-data.json', 'utf8'));
  
  for (const blog of blogData) {
    const { error } = await supabase
      .from('blogs')
      .insert([{
        title: blog.title,
        slug: blog.slug,
        description: blog.description,
        content: blog.content,
        cover_image: blog.coverImage, // Renamed field
        tags: blog.tags,
        author: blog.author,
        published: blog.published,
        featured: blog.featured,
        reading_time: blog.readingTime, // Renamed field
        views: blog.views
      }]);
    
    if (error) {
      console.error('Error migrating blog:', error);
    }
  }
}
```

## 7. Troubleshooting

### Common Issues:

1. **Supabase connection errors**: Ensure your environment variables are correctly set
2. **Field name mismatches**: Check that your data uses the correct field names (`cover_image` vs `coverImage`)
3. **RLS policies**: Make sure your Row Level Security policies are configured correctly for your use case

### Development Tips:

1. Use Supabase Studio to inspect your data during development
2. Enable logging in your Supabase project to debug queries
3. Test your API routes individually before integrating with frontend components