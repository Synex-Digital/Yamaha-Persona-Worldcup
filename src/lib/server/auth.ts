import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/server/sessionStore';

const getJwtSecretKey = () => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error('The environment variable ADMIN_SESSION_SECRET is not set.');
  }
  return secret;
};

export const verifyAuth = async (token: string) => {
  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(getJwtSecretKey())
    );
    
    const sessionId = verified.payload.sessionId as string | undefined;
    if (!sessionId || !(await validateSession(sessionId))) {
      throw new Error('Your session has been revoked or is invalid.');
    }
    
    return verified.payload;
  } catch (err) {
    throw new Error('Your token has expired.');
  }
};

export const generateToken = async (payload: any) => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(getJwtSecretKey()));
};

export const setAuthCookie = async (token: string) => {
  const cookieStore = await cookies();
  cookieStore.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
};

export const clearAuthCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');
};

export const getAuthCookie = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('admin_token')?.value;
};
