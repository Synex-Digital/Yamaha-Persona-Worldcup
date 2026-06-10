import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { verifyAuth, getAuthCookie } from '@/lib/server/auth';
import { z } from 'zod';

async function checkAdmin() {
  const token = await getAuthCookie();
  if (!token) throw new Error('Unauthorized');
  const payload = await verifyAuth(token);
  if (payload.role !== 'superadmin') {
    throw new Error('Forbidden');
  }
}

const bikeMappingSchema = z.object({
  bike_id: z.coerce.number().int().positive(),
  weight_percent: z.coerce.number().int().min(0).max(100),
  priority_order: z.coerce.number().int().min(1),
  is_active: z.boolean().optional().default(true),
});

const optionSchema = z.object({
  question_id: z.coerce.number().int().positive().optional(),
  id: z.coerce.number().int().positive().optional(),
  option_text: z.string().min(1),
  option_text_bn: z.string().optional().default(''),
  option_desc: z.string().optional().default(''),
  option_desc_bn: z.string().optional().default(''),
  icon_name: z.string().optional().default(''),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  is_active: z.boolean().optional().default(true),
  bike_mappings: z.array(bikeMappingSchema).optional().default([]),
});

function validateBehaviorWeights(mappings: Array<z.infer<typeof bikeMappingSchema>>) {
  if (!mappings.length) return null;

  const activeMappings = mappings.filter((mapping) => mapping.is_active !== false);
  if (!activeMappings.length) {
    return 'At least one active bike mapping is required.';
  }

  const totalWeight = activeMappings.reduce((sum, mapping) => sum + mapping.weight_percent, 0);
  if (totalWeight !== 100) {
    return 'Active bike weights must add up to 100%.';
  }

  return null;
}

export async function GET(req: Request) {
  try {
    await checkAdmin();
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');

    const options = await query<any[]>('SELECT * FROM quiz_options WHERE question_id = ? ORDER BY id ASC', [questionId]);
    const mappings = await query<any[]>(`
      SELECT
        m.option_id,
        m.bike_id,
        m.weight_percent,
        m.priority_order,
        m.is_active,
        b.model_name
      FROM option_bike_mappings m
      JOIN bikes b ON b.id = m.bike_id
      JOIN quiz_options o ON o.id = m.option_id
      WHERE o.question_id = ?
      ORDER BY m.priority_order ASC, m.id ASC
    `, [questionId]);

    const mappingMap = new Map<number, any[]>();
    for (const mapping of mappings) {
      const existing = mappingMap.get(mapping.option_id) || [];
      existing.push(mapping);
      mappingMap.set(mapping.option_id, existing);
    }

    return NextResponse.json({
      options: options.map((option) => ({
        ...option,
        bike_mappings: mappingMap.get(option.id) || [],
      })),
    });
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
    const parsed = optionSchema.safeParse(await req.json());
    if (!parsed.success || !parsed.data.question_id) {
      return NextResponse.json({ error: 'Invalid option data' }, { status: 400 });
    }

    const { question_id, option_text, option_text_bn, option_desc, option_desc_bn, icon_name, metadata, is_active, bike_mappings } = parsed.data;
    const questions = await query<any[]>('SELECT question_type FROM quiz_questions WHERE id = ?', [question_id]);
    const questionType = questions[0]?.question_type;

    if (questionType === 'behavior') {
      const weightError = validateBehaviorWeights(bike_mappings);
      if (weightError) {
        return NextResponse.json({ error: weightError }, { status: 400 });
      }
    }

    const result = await query<any>(
      'INSERT INTO quiz_options (question_id, option_text, option_text_bn, option_desc, option_desc_bn, icon_name, metadata, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [question_id, option_text, option_text_bn || null, option_desc, option_desc_bn || null, icon_name, JSON.stringify(metadata || {}), is_active]
    );

    const optionId = result.insertId;

    if (questionType === 'behavior') {
      for (const mapping of bike_mappings) {
        await query(
          `INSERT INTO option_bike_mappings
           (option_id, bike_id, weight_percent, priority_order, is_active)
           VALUES (?, ?, ?, ?, ?)`,
          [optionId, mapping.bike_id, mapping.weight_percent, mapping.priority_order, mapping.is_active !== false]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error adding option' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await checkAdmin();
    const parsed = optionSchema.safeParse(await req.json());
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ error: 'Invalid option data' }, { status: 400 });
    }

    const { id, option_text, option_text_bn, option_desc, option_desc_bn, icon_name, metadata, is_active, bike_mappings } = parsed.data;
    const questions = await query<any[]>(
      `SELECT q.question_type
       FROM quiz_options o
       JOIN quiz_questions q ON q.id = o.question_id
       WHERE o.id = ?`,
      [id]
    );
    const questionType = questions[0]?.question_type;

    if (questionType === 'behavior') {
      const weightError = validateBehaviorWeights(bike_mappings);
      if (weightError) {
        return NextResponse.json({ error: weightError }, { status: 400 });
      }
    }

    await query(
      'UPDATE quiz_options SET option_text = ?, option_text_bn = ?, option_desc = ?, option_desc_bn = ?, icon_name = ?, metadata = ?, is_active = ? WHERE id = ?',
      [option_text, option_text_bn || null, option_desc, option_desc_bn || null, icon_name, JSON.stringify(metadata || {}), is_active, id]
    );

    if (questionType === 'behavior') {
      await query('DELETE FROM option_bike_mappings WHERE option_id = ?', [id]);
      for (const mapping of bike_mappings) {
        await query(
          `INSERT INTO option_bike_mappings
           (option_id, bike_id, weight_percent, priority_order, is_active)
           VALUES (?, ?, ?, ?, ?)`,
          [id, mapping.bike_id, mapping.weight_percent, mapping.priority_order, mapping.is_active !== false]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error updating option' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await checkAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await query('DELETE FROM quiz_options WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error deleting option' }, { status: 500 });
  }
}
