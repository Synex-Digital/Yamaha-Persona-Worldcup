const DEFAULT_SITE_URL = 'http://localhost:3000';

function normalizeSiteUrl(value: string | undefined) {
  if (!value) return DEFAULT_SITE_URL;
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export const SITE_NAME = 'Yamaha Bangladesh AI Ride Personality Campaign';
export const DEFAULT_OG_IMAGE = '/prev-image.jpg';

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export function getMetadataBase() {
  return new URL(getSiteUrl());
}

export function toAbsoluteUrl(path: string) {
  return new URL(path, getMetadataBase()).toString();
}
