import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';
import { verifyAuth, getAuthCookie } from '@/lib/server/auth';
import { getAppSettings } from '@/lib/server/app-settings';

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
    return NextResponse.json({ settings: await getAppSettings() });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
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
    let eidVal = body.eid_camp_enabled;
    let wcVal = body.worldcup_camp_enabled;

    if (wcVal === 'true' || wcVal === true) {
      eidVal = 'false';
    } else if (eidVal === 'true' || eidVal === true) {
      wcVal = 'false';
    }

    if (eidVal !== undefined) await updateSetting('eid_camp_enabled', eidVal);
    if (wcVal !== undefined) await updateSetting('worldcup_camp_enabled', wcVal);

    if (eidVal !== undefined || wcVal !== undefined) {
      const isEidActive = eidVal === 'true' || eidVal === true;
      const isWcActive = wcVal === 'true' || wcVal === true;

      let activeQuestionId = 2; // Default Standard Destination
      if (isWcActive) {
        activeQuestionId = 5; // Worldcup
      } else if (isEidActive) {
        activeQuestionId = 4; // Eid
      }

      const allQuestionIds = [2, 4, 5];
      for (const qId of allQuestionIds) {
        await query(
          'UPDATE quiz_options SET is_active = ? WHERE question_id = ?',
          [qId === activeQuestionId ? 1 : 0, qId]
        );
      }
    }
    if (body.theme_mode !== undefined) await updateSetting('theme_mode', body.theme_mode);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to save settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
