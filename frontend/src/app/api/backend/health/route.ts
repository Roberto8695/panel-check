import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      server: 'Vercel Edge Function',
      version: '1.0.0'
    });
  } catch {
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
