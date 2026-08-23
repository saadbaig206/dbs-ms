import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const isLocalhost = host && (host.includes('localhost') || host.includes('127.0.0.1'));
    if (!apiUrl || (!isLocalhost && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')))) {
      apiUrl = host ? `${protocol}://${host}` : 'http://localhost:8000';
    }
    const fetchHeaders: Record<string, string> = {
      'Authorization': `Bearer ${token}`
    };
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) fetchHeaders['cookie'] = cookieHeader;
    const bypassHeader = request.headers.get('x-vercel-protection-bypass');
    if (bypassHeader) fetchHeaders['x-vercel-protection-bypass'] = bypassHeader;
    const setBypassCookie = request.headers.get('x-vercel-set-bypass-cookie');
    if (setBypassCookie) fetchHeaders['x-vercel-set-bypass-cookie'] = setBypassCookie;

    const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: fetchHeaders
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
