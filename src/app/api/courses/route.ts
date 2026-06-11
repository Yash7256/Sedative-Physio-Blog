import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

// GET - Fetch all courses
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

// POST - Create a new course
export async function POST(request: Request) {
  try {
    const body = await request.json();

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

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('courses')
      .insert({
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
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
