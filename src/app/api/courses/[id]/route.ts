import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PUT - Update a course
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    const {
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
      access_type,
    } = body;

    const { data, error } = await supabase
      .from('courses')
      .update({
        title,
        instructor,
        instructor_image,
        duration,
        cover_image,
        description,
        price: price || 0,
        rating: rating || 0,
        students: students || '0 Students',
        is_bestseller: is_bestseller || false,
        topics_included: topics_included || [],
        batch_highlights: batch_highlights || [],
        sections_to_discuss: sections_to_discuss || [],
        batch_start_date,
        batch_time,
        language,
        access_type,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a course
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
