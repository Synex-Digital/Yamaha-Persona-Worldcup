import { NextResponse } from 'next/server';
import { getAuthCookie, verifyAuth } from '@/lib/server/auth';

export async function GET() {
  try {
    const token = await getAuthCookie();
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = await verifyAuth(token);
    
    return NextResponse.json({ 
      authenticated: true,
      user: { username: payload.username }
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
