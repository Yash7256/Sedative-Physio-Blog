import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { supabaseAdmin } from '../../../../../lib/supabaseServer';

// Configure upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'notes');

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if Supabase is configured
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
    }

    const { id } = params;

    // Find note by ID
    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Construct file path
    const filepath = path.join(UPLOAD_DIR, note.filename);

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch (error) {
      return NextResponse.json({ error: 'Note file not found' }, { status: 404 });
    }

    // Read file
    const fileBuffer = await fs.readFile(filepath);

    // Create response with proper headers
    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="${note.originalName}"`);
    response.headers.set('Content-Length', fileBuffer.length.toString());

    return response;
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if Supabase is configured
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
    }

    const { id } = params;

    // Find note by ID
    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .select('filename')
      .eq('id', id)
      .single();

    if (error || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Construct file path
    const filepath = path.join(UPLOAD_DIR, note.filename);

    // Delete file from filesystem
    try {
      await fs.unlink(filepath);
    } catch (error) {
      console.warn('Failed to delete file from filesystem:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete note from database
    const { error: deleteError } = await supabaseAdmin
      .from('notes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete note from database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}