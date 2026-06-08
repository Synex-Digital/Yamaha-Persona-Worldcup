import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { z } from 'zod';

const quizSchema = z.object({
  traits: z.array(z.union([z.string(), z.number()])).min(1)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = quizSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid traits array' }, { status: 400 });
    }

    const { traits } = result.data;
    
    // traits is an array of option IDs [behavior_id, destination_id, aspiration_id]
    const behaviorId = traits[0];
    const destinationId = traits[1];
    const aspirationId = traits[2];

    // 1. Get Destination & Aspiration metadata
    const [dest, asp] = await Promise.all([
      query<any[]>('SELECT option_text, metadata FROM quiz_options WHERE id = ?', [destinationId]),
      query<any[]>('SELECT option_text, metadata FROM quiz_options WHERE id = ?', [aspirationId])
    ]);

    const aspirationRaw = asp[0]?.metadata;
    const aspirationData = (typeof aspirationRaw === 'string' ? JSON.parse(aspirationRaw) : aspirationRaw) || {};
    const preferredColor = aspirationData.color || '';
    
    const destRaw = dest[0]?.metadata;
    const destData = (typeof destRaw === 'string' ? JSON.parse(destRaw) : destRaw) || {};

    const resultPersona = {
      behavior: behaviorId,
      destination_id: Number(destinationId),
      destination: dest[0]?.option_text || 'Unknown',
      destination_meta: destData,
      aspiration_id: Number(aspirationId),
      aspiration: asp[0]?.option_text || 'Unknown',
      aspiration_meta: aspirationData
    };

    return NextResponse.json({
      success: true,
      persona: JSON.stringify(resultPersona)
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
