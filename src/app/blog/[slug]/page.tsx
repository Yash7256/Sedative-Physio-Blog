import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Paragraph } from "@/components/Paragraph";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from 'next/headers';

// Force dynamic rendering since we use headers()
export const dynamic = 'force-dynamic';

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  cover_image: string;
  coverImage?: string; // For compatibility
  tags: string[];
  author: string;
  published: boolean;
  featured: boolean;
  created_at?: string;
  updated_at?: string;
  reading_time: number;
  views: number;
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  // Fetch blog from Supabase with error handling
  try {
    // Construct proper URL using headers for server components
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const apiUrl = `${protocol}://${host}/api/blogs/${params.slug}`;
    
    const response = await fetch(apiUrl, {
      cache: 'no-store'
    });
    
    const result = await response.json();
    
    if (!result.success) {
      notFound();
    }
    
    const blog: BlogPost = {
      ...result.data,
      coverImage: result.data.cover_image // Map for compatibility
    };
    
    return (
      <Container>
        <article className="max-w-4xl mx-auto">
          {/* Back button */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            ←
            <span>Back to research</span>
          </Link>

          {/* Header */}
          <header className="mb-12">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full mb-4">
                {blog.published ? 'Published Research' : 'Draft'}
              </span>
              {blog.featured && (
                <span className="inline-block px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full ml-2">
                  Featured Study
                </span>
              )}
            </div>

            <Heading className="text-4xl md:text-5xl font-bold mb-6">
              {blog.title}
            </Heading>

            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-8">
              <span>By {blog.author}</span>
              <span>•</span>
              <time dateTime={blog.created_at}>
                {blog.created_at ? new Date(blog.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown date'}
              </time>
              <span>•</span>
              <span>{blog.reading_time} min read</span>
              <span>•</span>
              <span>{blog.views} views</span>
            </div>

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {blog.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Cover Image */}
            <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden mb-8">
              <Image
                src={blog.coverImage || blog.cover_image}
                alt={blog.title}
                fill
                className="object-cover"
                priority
              />
            </div>

            <Paragraph className="text-xl text-gray-600 leading-relaxed">
              {blog.description}
            </Paragraph>
          </header>

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-gray-600">
                Research conducted by <span className="font-semibold">{blog.author}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-gray-500">
                  Last updated: {blog.updated_at ? new Date(blog.updated_at).toLocaleDateString() : 'Unknown date'}
                </span>
              </div>
            </div>
          </footer>
        </article>
      </Container>
    );
  } catch (error) {
    console.error('Error fetching blog:', error);
    notFound();
  }
}

// Generate static params for all published blogs
export async function generateStaticParams() {
  // Return empty array to use dynamic rendering
  // This avoids build-time API calls that may fail
  return [];
}