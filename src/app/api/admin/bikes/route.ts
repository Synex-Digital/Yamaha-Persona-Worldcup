import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { verifyAuth, getAuthCookie } from '@/lib/server/auth';

async function checkAdmin() {
  const token = await getAuthCookie();
  if (!token) throw new Error('Unauthorized');
  const payload = await verifyAuth(token);
  if (payload.role !== 'superadmin') {
    throw new Error('Forbidden');
  }
}

export async function GET() {
  try {
    await checkAdmin();
    const bikes = await query('SELECT * FROM bikes ORDER BY created_at DESC');
    return NextResponse.json({ bikes });
  } catch (err: any) {
    if (err.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await checkAdmin();
    const body = await req.json();
    const { model_name, type, description, description_bn, image_url, colors } = body;
    
    await query(
      'INSERT INTO bikes (model_name, type, description, description_bn, image_url, colors) VALUES (?, ?, ?, ?, ?, ?)',
      [
        model_name,
        type,
        description || '',
        description_bn || null,
        image_url || '',
        JSON.stringify(colors || [])
      ]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await checkAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    await query('DELETE FROM bikes WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await checkAdmin();
    const body = await req.json();
    const { id, model_name, type, description, description_bn, image_url, colors } = body;
    
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    await query(
      'UPDATE bikes SET model_name = ?, type = ?, description = ?, description_bn = ?, image_url = ?, colors = ? WHERE id = ?',
      [
        model_name,
        type,
        description || '',
        description_bn || null,
        image_url || '',
        JSON.stringify(colors || []),
        id
      ]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
