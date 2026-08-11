import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public paths
  const isPublicPath = path === '/login' || path === '/';

  const token = request.cookies.get('access_token')?.value;
  const role = request.cookies.get('user_role')?.value;

  if (isPublicPath) {
    if (token) {
      if (role === 'staff') {
        return NextResponse.redirect(new URL('/pos', request.nextUrl));
      }
      return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
    }
    return NextResponse.next();
  }

  // Protected paths
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  // Admin-only paths
  const isAdminOnlyPath = 
    path.startsWith('/dashboard') || 
    path.startsWith('/expenses') || 
    path.startsWith('/finance') || 
    path.startsWith('/reports');

  if (isAdminOnlyPath && role !== 'admin') {
    return NextResponse.redirect(new URL('/pos', request.nextUrl));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/attendance/:path*',
    '/bookings/:path*',
    '/calendar/:path*',
    '/clients/:path*',
    '/expenses/:path*',
    '/finance/:path*',
    '/inventory/:path*',
    '/pos/:path*',
    '/reports/:path*',
    '/services/:path*',
    '/settings/:path*',
    '/staff/:path*',
  ],
};
