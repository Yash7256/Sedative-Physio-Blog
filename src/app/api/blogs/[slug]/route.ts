import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseServer';
import { Blog } from '@/models/Blog';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('blogs')
      .select('*')
      .eq('slug', params.slug)
      .single();

    if (error) {
      console.error('Error fetching blog:', error);
      return NextResponse.json(
        { success: false, error: 'Blog not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await supabaseAdmin
      .from('blogs')
      .update({ views: (data.views || 0) + 1 })
      .eq('slug', params.slug);

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error: any) {
    console.error('Error fetching blog:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch blog' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const { title, description, content, cover_image, coverImage, tags, author, published, featured } = body;

    // Use cover_image if available, otherwise fallback to coverImage
    const coverImageFinal = cover_image || coverImage;

    // Prepare update object with only provided fields
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (coverImageFinal !== undefined) updateData.cover_image = coverImageFinal;
    if (tags !== undefined) updateData.tags = tags;
    if (author !== undefined) updateData.author = author;
    if (published !== undefined) updateData.published = published;
    if (featured !== undefined) updateData.featured = featured;

    // Recalculate reading time if content is updated
    if (content !== undefined) {
      const wordsPerMinute = 200;
      const textContent = content.replace(/<[^>]*>/g, ''); // Strip HTML tags
      const wordCount = textContent.split(/\s+/).filter(Boolean).length;
      updateData.reading_time = Math.ceil(wordCount / wordsPerMinute);
    }

    const { data, error } = await supabaseAdmin
      .from('blogs')
      .update(updateData)
      .eq('slug', params.slug)
      .select()
      .single();

    if (error) {
      console.error('Error updating blog:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update blog' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Blog updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating blog:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update blog' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('blogs')
      .delete()
      .eq('slug', params.slug);

    if (error) {
      console.error('Error deleting blog:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to delete blog' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Blog deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting blog:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete blog' },
      { status: 500 }
    );
  }
}