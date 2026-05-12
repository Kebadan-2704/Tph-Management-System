import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('tph_session');
  
  if (session && session.value === 'admin_authenticated') {
    return NextResponse.json({ role: 'admin' });
  }
  return NextResponse.json({ role: null });
}
