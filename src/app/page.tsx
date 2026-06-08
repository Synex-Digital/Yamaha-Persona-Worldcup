import { redirect } from 'next/navigation';
import HomeClient from './HomeClient';
import { getBooleanAppSetting } from '@/lib/server/app-settings';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const campaignCompleted = await getBooleanAppSetting('campaign_completed');

  if (campaignCompleted) {
    redirect('/thank-you');
  }

  return <HomeClient />;
}
