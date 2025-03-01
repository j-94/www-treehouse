import { NextRequest, NextResponse } from 'next/server';
import { getNeonDb } from '@/lib/db/neon-db';
import { parseSearchParams } from '@/lib/search-params';

const ITEMS_PER_PAGE = 24;

export async function GET(request: NextRequest) {
  try {
    const db = getNeonDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        message: 'No Neon database connection available'
      }, { status: 500 });
    }

    // Parse search parameters
    const searchParams = parseSearchParams(Object.fromEntries(request.nextUrl.searchParams));
    const page = Math.max(1, Number(searchParams.page) || 1);
    const offset = (page - 1) * ITEMS_PER_PAGE;
    
    // Build query conditions
    let conditions = [];
    let params: any[] = [];
    let paramIndex = 1;
    
    if (searchParams.search) {
      conditions.push(`name ILIKE $${paramIndex}`);
      params.push(`%${searchParams.search}%`);
      paramIndex++;
    }
    
    if (searchParams.state) {
      conditions.push(`state = $${paramIndex}`);
      params.push(searchParams.state);
      paramIndex++;
    }
    
    if (searchParams.rtg) {
      conditions.push(`rating >= $${paramIndex}`);
      params.push(Number(searchParams.rtg));
      paramIndex++;
    }
    
    // Build the WHERE clause
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';
    
    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM dispensaries 
      ${whereClause}
    `;
    
    const countResult = await db.execute(countQuery, params);
    const totalResults = Number(countResult[0]?.total) || 0;
    
    // Query dispensaries with pagination
    const query = `
      SELECT * 
      FROM dispensaries 
      ${whereClause} 
      ORDER BY rating DESC 
      LIMIT ${ITEMS_PER_PAGE} 
      OFFSET ${offset}
    `;
    
    const dispensaries = await db.execute(query, params);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return NextResponse.json({
      success: true,
      data: dispensaries.map(d => ({
        id: d.id,
        name: d.name,
        address: d.address || '',
        city: d.city,
        state: d.state,
        phone_number: d.phone_number || '',
        website: d.website || '',
        rating: Number(d.rating) || 0,
        user_ratings_total: Number(d.user_ratings_total) || 0,
        latitude: Number(d.latitude) || 0,
        longitude: Number(d.longitude) || 0,
        image_url: d.image_url || '',
        description: d.description || '',
        reviews: []
      })),
      pagination: {
        total: totalResults,
        page,
        totalPages,
        hasNextPage,
        hasPrevPage,
        itemsPerPage: ITEMS_PER_PAGE
      }
    });
  } catch (error) {
    console.error('Error retrieving dispensaries from Neon:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}