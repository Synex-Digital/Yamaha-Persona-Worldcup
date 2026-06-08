import { NextResponse } from 'next/server';
import { query } from '@/lib/server/mysql';

export async function GET() {
  try {
    // Test the database connection with a fast query
    await query('SELECT 1');
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
