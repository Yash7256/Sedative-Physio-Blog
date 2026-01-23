import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { Blog } from '@/types/blog';

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const published = searchParams.get('published') === 'true';
    const featured = searchParams.get('featured') === 'true';
    
    let query = supabaseAdmin.from('blogs').select('*');
    
    if (published) query = query.eq('published', true);
    if (featured) query = query.eq('featured', true);
    
    const skip = (page - 1) * limit;
    query = query.range(skip, skip + limit - 1).order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching blogs:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch blogs' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('blogs')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error counting blogs:', countError);
      return NextResponse.json(
        { success: false, error: 'Failed to count blogs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count! / limit),
        totalItems: count!,
        hasNextPage: page < Math.ceil(count! / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blogs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { title, description, content, cover_image, coverImage, tags, author, published, featured } = body;
    
    // Use cover_image if available, otherwise fallback to coverImage (for backward compatibility)
    const coverImageFinal = cover_image || coverImage;

    // Validate required fields
    if (!title || !description || !content || !coverImageFinal) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const { data: existingBlog, error: existingError } = await supabaseAdmin
      .from('blogs')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingBlog) {
      return NextResponse.json(
        { success: false, error: 'Blog with this title already exists' },
        { status: 400 }
      );
    }

    // Calculate reading time
    const wordsPerMinute = 200;
    const textContent = content.replace(/<[^>]*>/g, ''); // Strip HTML tags
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);

    const newBlog: Omit<Blog, 'id' | 'created_at' | 'updated_at'> = {
      title,
      slug,
      description,
      content,
      cover_image: coverImageFinal,
      tags: tags || [],
      author: author || 'Admin',
      published: published || false,
      featured: featured || false,
      reading_time: readingTime,
      views: 0
    };

    const { data, error } = await supabaseAdmin
      .from('blogs')
      .insert([newBlog])
      .select()
      .single();

    if (error) {
      console.error('Error creating blog:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create blog' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Blog created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating blog:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create blog' },
      { status: 500 }
    );
  }
}