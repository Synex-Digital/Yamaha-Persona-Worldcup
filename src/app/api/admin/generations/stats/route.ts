import { NextResponse } from 'next/server';
import { getAuthCookie, verifyAuth } from '@/lib/server/auth';
import { getLifetimeStats } from '@/lib/server/statsCache';

async function checkSuperAdmin() {
  const token = await getAuthCookie();
  if (!token) throw new Error('Unauthorized');
  const payload = await verifyAuth(token);
  if (payload.role !== 'superadmin') {
    throw new Error('Forbidden');
  }
}

export async function GET() {
  try {
    await checkSuperAdmin();

    const stats = await getLifetimeStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Stats endpoint error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
