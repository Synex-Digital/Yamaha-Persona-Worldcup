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
      if ((req as any)._parsedBody) {
        return resolveLanguage((req as any)._parsedBody?.lang);
      }
      const body = await req.json();
      (req as any)._parsedBody = body;
      req.json = async () => body;
      return resolveLanguage(body?.lang);
    } catch {
      return DEFAULT_LANGUAGE;
    }
  }

  if (contentType.includes('multipart/form-data')) {
    try {
      if ((req as any)._parsedFormData) {
        const formData = (req as any)._parsedFormData;
        return resolveLanguage(typeof formData.get('lang') === 'string' ? (formData.get('lang') as string) : null);
      }
      const formData = await req.formData();
      (req as any)._parsedFormData = formData;
      req.formData = async () => formData;
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
