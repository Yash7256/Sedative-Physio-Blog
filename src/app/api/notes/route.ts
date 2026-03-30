import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      const cookieStore = await cookies();
      
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      });
      
      // Validate user using the cookie
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized. Please login to access notes.' }, { status: 401 });
      }
    } else if (!supabaseAdmin) {
      // If no Supabase configured, allow access (for development)
      console.warn('Supabase not configured, allowing anonymous access');
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const category = url.searchParams.get('category') || '';
    const search = url.searchParams.get('search') || '';

    // Calculate offset value for pagination
    const offset = (page - 1) * limit;

    // Build query
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    let query = supabaseAdmin.from('notes').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    
    if (category) {
      query = query.ilike('category', `%${category}%`); // Case insensitive
    }
    
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`
      );
    }

    // Fetch notes with pagination
    const { data: notes, count, error } = await query;

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    const total = count || 0;

    // Attach preview URLs (signed when using Supabase Storage, or local public path fallback)
    const enriched = await Promise.all((notes || []).map(async (note: any) => {
      let preview_url: string | null = null;

      if (supabaseAdmin && note.filename) {
        try {
          const { data: urlData, error: urlError } = await supabaseAdmin.storage
            .from('notes')
            .createSignedUrl(note.filename, 60 * 60); // 1 hour

          if (!urlError && urlData && urlData.signedUrl) {
            preview_url = urlData.signedUrl;
          }
        } catch (err) {
          console.warn('Failed to create signed URL for', note.filename, err);
        }
      }

      // Fallback to local public folder - use original_name if available
      if (!preview_url && note.filename) {
        // Try original_name first (files in /public/), then filename (files in /uploads/notes/)
        const fileName = note.original_name || note.originalName || note.filename;
        preview_url = `/${fileName}`;
      }

      return { ...note, preview_url };
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalNotes: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}
