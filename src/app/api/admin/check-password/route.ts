import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provided = body?.password;

    const serverPassword = process.env.ADMIN_PASSWORD;

    if (!serverPassword) {
      return NextResponse.json({ success: false, error: 'Server admin password not configured' }, { status: 500 });
    }

    if (typeof provided !== 'string') {
      return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
    }

    if (provided === serverPassword) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  } catch (err) {
    console.error('Check password error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
