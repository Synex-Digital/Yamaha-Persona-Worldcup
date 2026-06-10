import { NextResponse } from 'next/server';
import { generateToken, setAuthCookie } from '@/lib/server/auth';
import { addSession } from '@/lib/server/sessionStore';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { username, password } = result.data;

    // Check against env variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 500 });
    }

    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               req.headers.get('x-real-ip') || 
               '127.0.0.1';

    if (superAdminUsername && superAdminPassword && username === superAdminUsername && password === superAdminPassword) {
      // Create session
      const sessionId = await addSession({ username, role: 'superadmin', userAgent, ip });
      
      // Generate token for super admin
      const token = await generateToken({ username, role: 'superadmin', sessionId });
      
      // Set cookie
      await setAuthCookie(token);

      return NextResponse.json({ success: true, message: 'Logged in successfully' });
    }

    if (username === adminUsername && password === adminPassword) {
      // Create session
      const sessionId = await addSession({ username, role: 'admin', userAgent, ip });

      // Generate token
      const token = await generateToken({ username, role: 'admin', sessionId });
      
      // Set cookie
      await setAuthCookie(token);

      return NextResponse.json({ success: true, message: 'Logged in successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
