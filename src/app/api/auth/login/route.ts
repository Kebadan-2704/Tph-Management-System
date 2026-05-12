import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (password === 'password') {
      const response = NextResponse.json({ success: true, role: 'admin' });
      // Set secure HTTP-only cookie valid for 6 hours
      response.cookies.set('tph_session', 'admin_authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 6 * 60 * 60, // 6 hours
        path: '/',
      });
      return response;
    }
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
