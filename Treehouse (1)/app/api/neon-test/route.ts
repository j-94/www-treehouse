import { NextRequest, NextResponse } from 'next/server';
import { testNeonConnection, initializeNeonDb, getNeonDb } from '@/lib/db/neon-db';

// Route handler for testing Neon database connection
export async function GET(request: NextRequest) {
  try {
    // Test connection
    const connectionTest = await testNeonConnection();
    
    if (!connectionTest.success) {
      return NextResponse.json(connectionTest, { status: 500 });
    }
    
    // Initialize database schema
    const initialized = await initializeNeonDb();
    
    // Return response
    return NextResponse.json({
      success: true,
      connection: connectionTest,
      initialized,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in Neon test route:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}