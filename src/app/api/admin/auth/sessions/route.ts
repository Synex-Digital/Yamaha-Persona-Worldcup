import { NextResponse } from 'next/server';
import { verifyAuth, getAuthCookie, clearAuthCookie } from '@/lib/server/auth';
import { getActiveSessions, revokeSession, revokeAllSessions } from '@/lib/server/sessionStore';

async function checkAdmin() {
  const token = await getAuthCookie();
  if (!token) throw new Error('Unauthorized');
  const payload = await verifyAuth(token);
  if (payload.role !== 'superadmin') {
    throw new Error('Forbidden');
  }
  return payload;
}

export async function GET() {
  try {
    const payload = await checkAdmin();
    const sessions = await getActiveSessions();
    
    const sessionsWithCurrent = sessions.map(s => ({
      ...s,
      isCurrent: s.id === payload.sessionId
    }));

    return NextResponse.json({ sessions: sessionsWithCurrent });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    const payload = await checkAdmin();
    
    const { searchParams } = new URL(req.url);
    const revokeAll = searchParams.get('all') === 'true';
    
    if (revokeAll) {
      await revokeAllSessions();
      await clearAuthCookie();
      return NextResponse.json({ success: true, loggedOut: true });
    }
    
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }
    
    await revokeSession(sessionId);
    
    const isCurrent = sessionId === payload.sessionId;
    if (isCurrent) {
      await clearAuthCookie();
    }
    
    return NextResponse.json({ success: true, loggedOut: isCurrent });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
