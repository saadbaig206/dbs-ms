import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('access_token', '', { path: '/', maxAge: 0 });
  response.cookies.set('refresh_token', '', { path: '/', maxAge: 0 });
  response.cookies.set('user_role', '', { path: '/', maxAge: 0 });
  return response;
}
