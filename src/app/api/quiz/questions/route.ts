import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { getRequestLanguage } from '@/lib/i18n/api';

export async function GET(req: Request) {
  try {
    const language = await getRequestLanguage(req);
    const questions = await query<any[]>(`
      SELECT 
        q.id as question_id,
        q.question_text,
        q.question_text_bn,
        q.question_type,
        o.id as option_id,
        o.option_text,
        o.option_text_bn,
        o.option_desc,
        o.option_desc_bn,
        o.icon_name
      FROM quiz_questions q
      JOIN quiz_options o ON q.id = o.question_id
      WHERE o.is_active = TRUE
      ORDER BY q.order_index ASC, o.id ASC
    `);

    // Group by question
    const grouped = questions.reduce((acc: any[], curr) => {
      let q = acc.find(item => item.id === curr.question_id);
      if (!q) {
        q = {
          id: curr.question_id,
          title: language === 'bn' && curr.question_text_bn ? curr.question_text_bn : curr.question_text,
          type: curr.question_type,
          options: []
        };
        acc.push(q);
      }
      q.options.push({
        id: curr.option_id,
        title: language === 'bn' && curr.option_text_bn ? curr.option_text_bn : curr.option_text,
        desc: language === 'bn' && curr.option_desc_bn ? curr.option_desc_bn : curr.option_desc,
        icon: curr.icon_name
      });
      return acc;
    }, []);

    return NextResponse.json({ questions: grouped });
  } catch (error) {
    console.error('Fetch quiz questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
