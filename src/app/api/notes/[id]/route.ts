import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../../../../lib/supabaseServer';

// Configure upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'notes');

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Find note by ID
    const { data: note, error } = await (supabaseAdmin
      ? supabaseAdmin.from('notes').select('*').eq('id', id).single()
      : Promise.resolve({ data: null, error: 'Supabase not configured' } as any));

    if (error || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // If stored in Supabase, generate a signed URL and redirect to it
    if (supabaseAdmin && note.filename) {
      try {
        const { data: urlData, error: urlError } = await supabaseAdmin.storage
          .from('notes')
          .createSignedUrl(note.filename, 60 * 60); // 1 hour

        if (!urlError && urlData && urlData.signedUrl) {
          return NextResponse.redirect(urlData.signedUrl);
        }
      } catch (err) {
        console.warn('Failed to create signed URL, falling back to local file:', err);
      }
    }

    // Fallback: serve local file - check multiple possible locations
    const possiblePaths = [
      path.join(UPLOAD_DIR, note.filename),
      path.join(process.cwd(), 'public', 'uploads', 'notes', note.filename),
      path.join(process.cwd(), 'public', note.original_name || note.originalName || note.filename),
    ];

    let filepath = '';
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        filepath = p;
        break;
      } catch {
        continue;
      }
    }

    if (!filepath) {
      return NextResponse.json({ error: 'Note file not found' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(filepath);
    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="${note.original_name || note.originalName || note.original_name}"`);
    response.headers.set('Content-Length', fileBuffer.length.toString());

    return response;
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Find note by ID
    const { data: note, error } = await (supabaseAdmin
      ? supabaseAdmin.from('notes').select('filename').eq('id', id).single()
      : Promise.resolve({ data: null, error: 'Supabase not configured' } as any));

    if (error || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Try deleting from Supabase storage
    if (supabaseAdmin && note.filename) {
      try {
        const { error: delErr } = await supabaseAdmin.storage.from('notes').remove([note.filename]);
        if (delErr) console.warn('Failed to remove file from storage:', delErr);
      } catch (err) {
        console.warn('Storage delete error:', err);
      }
    }

    // Also attempt to delete local file if present
    const filepath = path.join(UPLOAD_DIR, note.filename);
    try {
      await fs.unlink(filepath);
    } catch (err) {
      // ignore
    }

    // Delete record from DB
    if (supabaseAdmin) {
      const { error: deleteError } = await supabaseAdmin.from('notes').delete().eq('id', id);
      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        return NextResponse.json({ error: 'Failed to delete note from database' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}