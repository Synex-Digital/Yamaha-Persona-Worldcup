import { query } from '@/lib/server/mysql';

export const DEFAULT_APP_SETTINGS = {
  max_daily_generations: '10',
  max_weekly_generations: '50',
  max_monthly_generations: '100',
  otp_enabled: 'true',
  eid_camp_enabled: 'false',
  worldcup_camp_enabled: 'false',
  campaign_completed: 'false',
  theme_mode: 'dark',
} as const;

export type AppSettingKey = keyof typeof DEFAULT_APP_SETTINGS;

export async function getAppSettings() {
  try {
    const rows = await query<Array<{ setting_key: string; setting_value: string }>>(
      'SELECT setting_key, setting_value FROM app_settings'
    );

    const settings: Record<string, string> = { ...DEFAULT_APP_SETTINGS };

    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }

    return settings;
  } catch (error) {
    console.warn('[getAppSettings] Database not available or error occurred. Falling back to default settings:', error instanceof Error ? error.message : error);
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export async function getAppSetting(key: AppSettingKey) {
  try {
    const rows = await query<Array<{ setting_value: string }>>(
      'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
      [key]
    );

    return rows[0]?.setting_value ?? DEFAULT_APP_SETTINGS[key];
  } catch (error) {
    console.warn(`[getAppSetting] Database not available or error occurred for key "${key}". Falling back to default:`, error instanceof Error ? error.message : error);
    return DEFAULT_APP_SETTINGS[key];
  }
}

export async function getBooleanAppSetting(key: AppSettingKey) {
  const value = await getAppSetting(key);
  return value === 'true';
}
