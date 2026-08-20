import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const isLocalhost = host && (host.includes('localhost') || host.includes('127.0.0.1'));
    if (!apiUrl || (!isLocalhost && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')))) {
      apiUrl = host ? `${protocol}://${host}` : 'http://localhost:8000';
    }

    console.log("DEBUG: process.env.NEXT_PUBLIC_API_URL =", process.env.NEXT_PUBLIC_API_URL);
    console.log("DEBUG: Host header =", host);
    console.log("DEBUG: Protocol =", protocol);
    console.log("DEBUG: Using apiUrl =", apiUrl);
    console.log("DEBUG: Attempting backend fetch to =", `${apiUrl}/api/v1/auth/login` , "for email =", email);

    const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    console.log("DEBUG: Response status from FastAPI =", res.status);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.log("DEBUG: FastAPI Error payload =", errData);
      const fallbackError = res.status === 401 
        ? 'Invalid email or password' 
        : `Backend error (${res.status}): ${res.statusText || 'Unable to connect'}`;
      return NextResponse.json(
        { error: errData.detail || fallbackError },
        { status: res.status }
      );
    }

    const data = await res.json();
    const response = NextResponse.json({ success: true, role: data.role });

    // Set HTTP-only cookies
    response.cookies.set('access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 8, // 8 days
    });

    response.cookies.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 8, // 8 days
    });

    // Also store user role in a non-httpOnly cookie for the client if needed
    response.cookies.set('user_role', data.role, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 8,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
