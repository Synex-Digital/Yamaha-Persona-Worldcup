import { NextResponse } from 'next/server';
import { verifyAuth, getAuthCookie } from '@/lib/server/auth';
import { getOverviewStats } from '@/lib/server/statsCache';

async function checkAdmin() {
  const token = await getAuthCookie();
  if (!token) throw new Error('Unauthorized');
  const payload = await verifyAuth(token);
  if (payload.role !== 'admin' && payload.role !== 'superadmin') {
    throw new Error('Forbidden');
  }
}

export async function GET() {
  try {
    await checkAdmin();
    const stats = await getOverviewStats();
    return NextResponse.json({ stats });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
