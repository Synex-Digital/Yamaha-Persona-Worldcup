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
    const questions = await query<any[]>('SELECT * FROM quiz_questions ORDER BY order_index ASC');
    return NextResponse.json({ questions });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await checkAdmin();
    const { question_text, question_text_bn, question_type, order_index } = await req.json();
    await query('INSERT INTO quiz_questions (question_text, question_text_bn, question_type, order_index) VALUES (?, ?, ?, ?)', 
      [question_text, question_text_bn || null, question_type, order_index || 0]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error adding question' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await checkAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await query('DELETE FROM quiz_questions WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error deleting question' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await checkAdmin();
    const { id, question_text, question_text_bn, question_type, order_index } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    await query(
      'UPDATE quiz_questions SET question_text = ?, question_text_bn = ?, question_type = ?, order_index = ? WHERE id = ?',
      [question_text, question_text_bn || null, question_type, order_index || 0, id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error updating question' }, { status: 500 });
  }
}
