import { cookies } from 'next/headers';
import { DEFAULT_LANGUAGE, LANG_COOKIE_NAME, resolveLanguage } from './translations';
import { Language } from './types';

export async function getServerLanguage(): Promise<Language> {
  try {
    const cookieStore = await cookies();
    return resolveLanguage(cookieStore.get(LANG_COOKIE_NAME)?.value ?? DEFAULT_LANGUAGE);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

