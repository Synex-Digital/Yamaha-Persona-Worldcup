import { DEFAULT_LANGUAGE, resolveLanguage, translations } from './translations';
import { Language } from './types';

export async function getRequestLanguage(req: Request): Promise<Language> {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('lang');
  if (fromQuery) {
    return resolveLanguage(fromQuery);
  }

  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const clone = req.clone();
      const body = await clone.json();
      return resolveLanguage(body?.lang);
    } catch {
      return DEFAULT_LANGUAGE;
    }
  }

  if (contentType.includes('multipart/form-data')) {
    try {
      const clone = req.clone();
      const formData = await clone.formData();
      return resolveLanguage(typeof formData.get('lang') === 'string' ? (formData.get('lang') as string) : null);
    } catch {
      return DEFAULT_LANGUAGE;
    }
  }

  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)yamaha_lang=([^;]+)/);
  return resolveLanguage(match?.[1] ?? DEFAULT_LANGUAGE);
}

export function getApiMessages(language: Language) {
  return translations[language].api;
}
