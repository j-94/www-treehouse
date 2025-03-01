import { NextRequest, NextResponse } from 'next/server';
import { getNeonDb, initializeNeonDb } from '@/lib/db/neon-db';
import { fetchDispensariesFromAPI } from '@/app/actions';

// Function to seed Neon database with dispensary data
export async function POST(request: NextRequest) {
  try {
    // Initialize Neon database
    const initialized = await initializeNeonDb();
    if (!initialized) {
      return NextResponse.json({
        success: false,
        message: 'Failed to initialize Neon database'
      }, { status: 500 });
    }

    const db = getNeonDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        message: 'No Neon database connection available'
      }, { status: 500 });
    }

    // Check if the database is already seeded
    const count = await db.execute<{ count: number }>(
      `SELECT COUNT(*) as count FROM dispensaries`
    );
    
    const recordCount = Number(count[0]?.count) || 0;
    if (recordCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Neon database already seeded with ${recordCount} records`,
        count: recordCount
      });
    }

    // Fetch dispensaries data
    const dispensaries = await fetchDispensariesFromAPI();
    
    // Insert dispensaries into Neon database
    let insertedCount = 0;
    for (const dispensary of dispensaries) {
      try {
        await db.execute(
          `INSERT INTO dispensaries (
            name, city, state, address, phone_number, website, 
            rating, user_ratings_total, latitude, longitude, 
            image_url, description, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            dispensary.name,
            dispensary.city || 'Bangkok', 
            dispensary.state || 'Thailand',
            dispensary.address || '',
            dispensary.phone_number || '',
            dispensary.website || '',
            dispensary.rating || 0,
            dispensary.user_ratings_total || 0,
            dispensary.geometry?.location?.lat || 0,
            dispensary.geometry?.location?.lng || 0,
            dispensary.image_url || '',
            dispensary.description || '',
            JSON.stringify({
              place_id: dispensary.place_id,
              address: dispensary.address,
              location: dispensary.geometry?.location,
              phone: dispensary.phone_number,
              website: dispensary.website
            })
          ]
        );
        
        insertedCount++;
      } catch (error) {
        console.error(`Error inserting dispensary ${dispensary.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded Neon database with ${insertedCount} dispensaries`,
      count: insertedCount
    });
  } catch (error) {
    console.error('Error seeding Neon database:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}