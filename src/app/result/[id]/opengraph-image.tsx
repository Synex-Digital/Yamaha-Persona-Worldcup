import { ImageResponse } from 'next/og';
import { query } from '@/lib/server/mysql';

export const alt = 'Yamaha Bangladesh AI Ride Personality Result';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface OgImageRow {
  generated_image_url: string | null;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rows = await query<OgImageRow[]>(`
    SELECT g.generated_image_url
    FROM generations g
    WHERE g.hash_id = ?
    LIMIT 1
  `, [id]);

  const data = rows[0];

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: 'linear-gradient(135deg, #050b16 0%, #0a1628 55%, #111827 100%)',
          }}
        />
      ),
      size
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#050b16',
        }}
      >
        {data.generated_image_url ? (
          // Social previews need a 1.91:1 frame. We top-align the portrait so the face stays visible.
          <img
            src={data.generated_image_url}
            alt="Yamaha Bangladesh AI Ride Personality Result"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              display: 'flex',
            }}
          />
        ) : null}
      </div>
    ),
    size
  );
}
