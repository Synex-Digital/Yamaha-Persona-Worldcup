import { NextResponse } from 'next/server';
import { getBooleanAppSetting } from '@/lib/server/app-settings';
import { getApiMessages, getRequestLanguage } from '@/lib/i18n/api';

export async function GET(req: Request) {
  try {
    const campaignCompleted = await getBooleanAppSetting('campaign_completed');

    return NextResponse.json({
      campaignCompleted,
      message: campaignCompleted ? getApiMessages(await getRequestLanguage(req)).campaignCompleted : null,
    });
  } catch (error) {
    console.error('Campaign status API error:', error);
    return NextResponse.json({ campaignCompleted: false, message: null }, { status: 200 });
  }
}
