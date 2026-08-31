// src/app/api/test-db/route.ts
import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test the connection
    const result = await sql`SELECT NOW() as current_time, version() as postgres_version`;
    
    return NextResponse.json({ 
      success: true, 
      message: '✅ Database connected successfully!',
      data: {
        currentTime: result[0].current_time,
        postgresVersion: result[0].postgres_version
      }
    });
  } catch (error) {
    console.error('❌ Database connection error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: '❌ Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}