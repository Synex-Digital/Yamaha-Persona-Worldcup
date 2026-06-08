import { query } from '@/lib/server/mysql';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ResultView from './ResultView';
import { SITE_NAME } from '@/lib/seo';

interface ResultMetadataRow {
  generated_image_url: string | null;
  traits_summary: string | null;
  name: string;
  model_name: string;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const hashId = resolvedParams.id;

  const generations = await query<ResultMetadataRow[]>(`
    SELECT g.generated_image_url, g.traits_summary, u.name, b.model_name
    FROM generations g
    JOIN users u ON g.user_id = u.id
    JOIN bikes b ON g.bike_id = b.id
    WHERE g.hash_id = ?
  `, [hashId]);

  if (generations.length === 0) return {};

  const data = generations[0];
  const title = `${data.name}'s ${data.model_name} Rider Persona`;
  const description = data.traits_summary || `${data.name}'s Yamaha AI Ride Personality result from the Yamaha Bangladesh campaign.`;
  const ogImageUrl = `/result/${hashId}/opengraph-image`;

  return {
    title,
    description,
    alternates: {
      canonical: `/result/${hashId}`,
    },
    openGraph: {
      title,
      description,
      url: `/result/${hashId}`,
      siteName: SITE_NAME,
      locale: 'en_BD',
      type: 'website',
      images: [{ url: ogImageUrl, alt: `${data.name} on ${data.model_name}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function Result({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const hashId = resolvedParams.id;

  if (!hashId) {
    notFound();
  }

  const generations = await query<Array<{
    generated_image_url: string;
    name: string;
    model_name: string;
    traits_summary: string;
    status: string;
  }>>(`
    SELECT g.generated_image_url, g.traits_summary, g.status, u.name, b.model_name 
    FROM generations g
    JOIN users u ON g.user_id = u.id
    JOIN bikes b ON g.bike_id = b.id
    WHERE g.hash_id = ?
  `, [hashId]);

  if (generations.length === 0) {
    notFound();
  }

  const data = generations[0];

  return (
    <ResultView
      generatedImageUrl={data.generated_image_url}
      name={data.name}
      modelName={data.model_name}
      traitsSummary={data.traits_summary}
      status={data.status}
    />
  );
}
