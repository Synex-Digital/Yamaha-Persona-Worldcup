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
    // const page = parseInt(searchParams.get('page') || '1');
    // const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const [users, countResult] = await Promise.all([
      query<any[]>(`
        SELECT 
          u.id, 
          u.name, 
          u.phone, 
          u.dob,
          u.gender,
          u.division,
          u.created_at,
          COALESCE(g.total_generations, 0) as total_generations
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_generations
          FROM generations
          GROUP BY user_id
        ) g ON u.id = g.user_id
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      query<any[]>('SELECT COUNT(*) as total FROM users')
    ]);

    const normalizedUsers = users.map((user) => ({
      ...user,
      id: Number(user.id),
      total_generations: Number(user.total_generations),
    }));

    return NextResponse.json({ 
      users: normalizedUsers, 
      total: Number(countResult[0].total),
      page,
      limit
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin users error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
