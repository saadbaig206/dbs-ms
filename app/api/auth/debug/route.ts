import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || null,
    VERCEL_URL: process.env.VERCEL_URL || null,
    NODE_ENV: process.env.NODE_ENV || null,
  });
}
