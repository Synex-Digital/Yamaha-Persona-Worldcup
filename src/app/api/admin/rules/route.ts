import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { verifyAuth, getAuthCookie } from '@/lib/server/auth';

async function checkAdmin() {
  const token = await getAuthCookie();
  if (!token) throw new Error('Unauthorized');
  await verifyAuth(token);
}

export async function GET() {
  try {
    await checkAdmin();
    const rules = await query(`
      SELECT r.*, b.model_name 
      FROM rules r 
      JOIN bikes b ON r.assigned_bike_id = b.id 
      ORDER BY r.created_at DESC
    `);
    return NextResponse.json({ rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await checkAdmin();
    const body = await req.json();
    const { trait_combination, assigned_bike_id } = body;
    
    await query(
      'INSERT INTO rules (trait_combination, assigned_bike_id) VALUES (?, ?)',
      [trait_combination, assigned_bike_id]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await checkAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    await query('DELETE FROM rules WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await checkAdmin();
    const body = await req.json();
    const { id, trait_combination, assigned_bike_id } = body;
    
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    await query(
      'UPDATE rules SET trait_combination = ?, assigned_bike_id = ? WHERE id = ?',
      [trait_combination, assigned_bike_id, id]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
