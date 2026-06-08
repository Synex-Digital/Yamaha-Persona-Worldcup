import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { verifyAuth, getAuthCookie } from '@/lib/server/auth';

async function checkAdmin() {
  const token = await getAuthCookie();
  if (!token) throw new Error('Unauthorized');
  await verifyAuth(token);
}

export async function GET(req: Request) {
  try {
    await checkAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const generations = await query<any[]>(`
      SELECT 
        g.id,
        g.hash_id,
        g.generated_image_url,
        g.resolved_bike_color,
        g.created_at,
        b.model_name as bike_model
      FROM generations g
      JOIN bikes b ON g.bike_id = b.id
      WHERE g.user_id = ?
      ORDER BY g.created_at DESC
    `, [userId]);

    return NextResponse.json({ generations });
  } catch (error) {
    console.error('Admin user generations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
