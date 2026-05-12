import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('tph_session');
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  
  // Exclude static assets, API auth routes, etc.
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname === '/loooBlack.png' ||
    request.nextUrl.pathname === '/looowhite.png' ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (!session || session.value !== 'admin_authenticated') {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
