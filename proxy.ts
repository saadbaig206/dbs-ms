import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public paths
  const isPublicPath = path === '/login' || path === '/';

  const rawToken = request.cookies.get('access_token')?.value;
  const token = rawToken && rawToken.trim().length > 10 ? rawToken.trim() : null;
  const role = request.cookies.get('user_role')?.value;

  // If logging out explicitly, delete cookies and allow access to login page
  if (isPublicPath && request.nextUrl.searchParams.get('logout') === '1') {
    const response = NextResponse.next();
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    response.cookies.delete('user_role');
    return response;
  }

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
    return NextResponse.redirect(new URL('/login?logout=1', request.nextUrl));
  }

  // Admin & Partner allowed paths for finance/reports/expenses
  const isFinanceOrAdminPath =
    path.startsWith('/expenses') ||
    path.startsWith('/finance') ||
    path.startsWith('/reports');

  if (isFinanceOrAdminPath && role !== 'admin' && role !== 'partner') {
    return NextResponse.redirect(new URL('/pos', request.nextUrl));
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export default proxy;

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
