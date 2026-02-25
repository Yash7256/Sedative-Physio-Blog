import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../../../../lib/supabaseServer';

// Configure upload directory (fallback)
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'notes');

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;
    const tags = formData.get('tags') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate file type (PDF only)
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Validate file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // If supabase admin client available, upload to Supabase Storage
    if (supabaseAdmin) {
      try {
        // Ensure bucket exists (ignore error if already exists)
        try {
          await supabaseAdmin.storage.createBucket('notes', { public: false });
        } catch (err) {
          // ignore
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = `${uniqueSuffix}_${file.name}`;
        const storagePath = `notes/${filename}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('notes')
          .upload(filename, buffer, { contentType: file.type });

        if (uploadError) {
          console.error('Supabase storage upload error:', uploadError);
          return NextResponse.json({ error: 'Supabase storage upload error', details: uploadError }, { status: 500 });
        }

        // Insert note metadata
        const { data: noteData, error: insertError } = await supabaseAdmin
          .from('notes')
          .insert([{
            title,
            description: description || '',
            filename: filename,
            original_name: file.name,
            content_type: file.type,
            size: file.size,
            category: category || null,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            storage_path: storagePath,
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Supabase insert error:', insertError);
          return NextResponse.json({ error: 'Failed to save note metadata', details: insertError }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'Note uploaded successfully',
          noteId: noteData.id,
          filename: noteData.filename,
        });
      } catch (err) {
        console.error('Supabase upload flow error:', err);
        // Fall back to local filesystem below
      }
    }

    // Fallback: save to local filesystem
    await ensureUploadDir();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}_${file.name}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filepath, buffer);

    if (supabaseAdmin) {
      // still insert metadata to Supabase (without storage path)
      const { data: noteData, error: insertError } = await supabaseAdmin
        .from('notes')
        .insert([{
          title,
          description: description || '',
          filename,
          original_name: file.name,
          content_type: file.type,
          size: file.size,
          category: category || null,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error (fallback):', insertError);
        return NextResponse.json({ error: 'Failed to save note metadata', details: insertError }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Note uploaded (fallback) successfully', noteId: noteData.id, filename: noteData.filename });
    }

    return NextResponse.json({ success: true, message: 'Note saved locally', filename });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload note' }, { status: 500 });
  }
}