import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { verifyAuth, getAuthCookie } from '@/lib/server/auth';
import { getAppSettings } from '@/lib/server/app-settings';

async function checkAdmin() {
  const token = await getAuthCookie();
  if (!token) throw new Error('Unauthorized');
  await verifyAuth(token);
}

export async function GET() {
  try {
    await checkAdmin();
    return NextResponse.json({ settings: await getAppSettings() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    await checkAdmin();
    const body = await req.json();
    const { max_daily_generations, max_weekly_generations, max_monthly_generations } = body;

    // Use INSERT ... ON DUPLICATE KEY UPDATE for each setting
    const updateSetting = async (key: string, value: string) => {
      await query(
        'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value.toString(), value.toString()]
      );
    };

    if (max_daily_generations !== undefined) await updateSetting('max_daily_generations', max_daily_generations);
    if (max_weekly_generations !== undefined) await updateSetting('max_weekly_generations', max_weekly_generations);
    if (max_monthly_generations !== undefined) await updateSetting('max_monthly_generations', max_monthly_generations);
    if (body.otp_enabled !== undefined) await updateSetting('otp_enabled', body.otp_enabled);
    if (body.campaign_completed !== undefined) await updateSetting('campaign_completed', body.campaign_completed);
    if (body.eid_camp_enabled !== undefined) {
      await updateSetting('eid_camp_enabled', body.eid_camp_enabled);

      const isEnabled = body.eid_camp_enabled === true || body.eid_camp_enabled === 'true';
      const enableQuestionId = isEnabled ? 4 : 2;
      const disableQuestionId = isEnabled ? 2 : 4;

      await query(
        'UPDATE quiz_options SET is_active = TRUE WHERE question_id = ?',
        [enableQuestionId]
      );
      await query(
        'UPDATE quiz_options SET is_active = FALSE WHERE question_id = ?',
        [disableQuestionId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
