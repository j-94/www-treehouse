"use server"

import { neon, neonConfig } from "@neondatabase/serverless"
import type { Dispensary } from "@/types/schema"
import { parseSearchParams, type SearchParams } from "@/lib/search-params"
import { dispensaries } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

// Conditionally import Database only on the server side
let sqlite: any;
let db: any;

// Only run this code on the server side
if (typeof window === 'undefined') {
  const Database = require("better-sqlite3");
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  
  // Create a persistent SQLite database
  sqlite = new Database("dispensaries.db");
  
  // Create a Drizzle instance
  db = drizzle(sqlite);
}

// Constants for pagination
const ITEMS_PER_PAGE = 24

// Helper function to get items per page (async to comply with "use server")
export async function getItemsPerPage(): Promise<number> {
  return ITEMS_PER_PAGE
}

// Fetch dispensaries using RapidAPI
export async function fetchDispensariesFromAPI(): Promise<Dispensary[]> {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  
  if (!rapidApiKey) {
    throw new Error("RAPIDAPI_KEY is not set in the environment variables");
  }
  
  // Target Bangkok for cannabis dispensaries
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': 'local-business-data.p.rapidapi.com'
    },
    next: { revalidate: 3600 } // Cache for 1 hour
  };
  
  try {
    // First, search for cannabis dispensaries in Bangkok
    const searchResponse = await fetch(
      'https://local-business-data.p.rapidapi.com/search?query=cannabis%20dispensary&limit=20&lat=13.7563&lng=100.5018&zoom=13&region=th&language=en',
      options
    );
    
    if (!searchResponse.ok) {
      throw new Error(`API responded with status: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData || !searchData.data || !Array.isArray(searchData.data)) {
      throw new Error("Unexpected API response structure");
    }
    
    // Transform the API response to match our Dispensary type
    return searchData.data.map((item: any) => ({
      place_id: item.place_id || item.business_id,
      name: item.name,
      address: item.address || "",
      city: "Bangkok",
      state: "Thailand",
      phone_number: item.phone_number || "",
      website: item.website || "",
      rating: item.rating || 0,
      user_ratings_total: item.reviews_count || 0,
      geometry: {
        location: {
          lat: item.latitude || 0,
          lng: item.longitude || 0
        }
      },
      image_url: item.photos?.length > 0 ? item.photos[0] : "",
      description: item.description || ""
    }));
  } catch (error) {
    console.error("Error fetching dispensaries from API:", error);
    throw error;
  }
}

export async function seedDatabase() {
  try {
    console.log("Starting database seeding process...")

    // Use direct SQL for table creation instead of schema builder
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS dispensaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        image_url TEXT,
        description TEXT,
        rating REAL,
        review_count INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        thumbhash TEXT
      );
    `)
    console.log("Dispensaries table created or already exists")

    // Check if the table is empty using direct SQL
    const countResult = sqlite.prepare("SELECT COUNT(*) as count FROM dispensaries").get()
    const count = countResult?.count || 0
    console.log("Current dispensary count:", count)

    if (count > 0) {
      console.log("Database already seeded")
      return { success: true, message: "Database already seeded" }
    }

    // Fetch dispensaries from API instead of gist
    const dispensaries = await fetchDispensariesFromAPI()
    console.log("Fetched dispensaries from API:", dispensaries.length)

    // Insert dispensaries one by one
    for (const d of dispensaries) {
      try {
        await db.insert(dispensaries).values({
          id: d.place_id,
          name: d.name,
          address: d.address || "",
          city: "Bangkok",
          state: "Thailand",
          phone_number: d.phone_number || "",
          website: d.website || "",
          rating: d.rating || 0,
          user_ratings_total: d.user_ratings_total || 0,
          latitude: d.geometry?.location?.lat || 0,
          longitude: d.geometry?.location?.lng || 0,
          image_url: d.image_url || "",
          description: d.description || ""
        }).onConflictDoNothing().execute()
        console.log(`Inserted dispensary: ${d.name}`)
      } catch (error) {
        console.error(`Error inserting dispensary ${d.name}:`, error)
      }
    }

    const newCount = await db.select({ count: sql`COUNT(*)` }).from(dispensaries).execute()
    const insertedCount = newCount[0].count - count

    console.log(`Successfully inserted ${insertedCount} dispensaries`)
    return { success: true, message: `Database seeded successfully with ${insertedCount} dispensaries` }
  } catch (error) {
    console.error("Error seeding database:", error)
    if (error instanceof Error) {
      return { success: false, message: `Error seeding database: ${error.message}` }
    }
    return { success: false, message: "An unknown error occurred while seeding the database" }
  }
}

// Fetch all dispensaries
export async function getDispensaries(): Promise<Dispensary[]> {
  try {
    const result = sqlite.prepare("SELECT * FROM dispensaries").all()
    return result.map(d => {
      // Parse metadata if it exists
      let metadata: any = {};
      try {
        if (d.metadata && typeof d.metadata === 'string') {
          metadata = JSON.parse(d.metadata);
        }
      } catch (err) {
        console.error("Error parsing metadata:", err);
      }
      
      // Get coordinates from the right columns - check both direct columns and metadata
      const lat = d.latitude !== undefined ? Number(d.latitude) : (metadata?.location?.lat || 0);
      const lng = d.longitude !== undefined ? Number(d.longitude) : (metadata?.location?.lng || 0);
      
      // Generate a random Bangkok-area coordinate if no valid coordinates
      const randomLat = (Math.random() * 0.1) + 13.7;
      const randomLng = (Math.random() * 0.1) + 100.5;
      
      return {
        id: d.id,
        name: d.name,
        address: metadata?.address || '',
        city: d.city,
        state: d.state,
        phone_number: metadata?.phone || '',
        website: metadata?.website || '',
        rating: Number(d.rating) || 0,
        user_ratings_total: Number(d.review_count) || 0,
        latitude: (lat && !isNaN(lat) && lat !== 0) ? lat : randomLat,
        longitude: (lng && !isNaN(lng) && lng !== 0) ? lng : randomLng,
        image_url: d.image_url || '',
        description: d.description || '',
        // Add a dummy reviews array since the component expects it
        reviews: []
      }
    }) as Dispensary[]
  } catch (error) {
    console.error("Error fetching dispensaries:", error)
    throw new Error("Failed to fetch dispensaries")
  }
}

// Fetch dispensaries with pagination and filtering
export async function fetchDispensariesWithPagination(searchParams: SearchParams): Promise<Dispensary[]> {
  try {
    const requestedPage = Math.max(1, Number(searchParams?.page) || 1)
    const offset = (requestedPage - 1) * ITEMS_PER_PAGE
    
    // Build the base query
    let query = "SELECT * FROM dispensaries WHERE 1=1"
    const params: any[] = []
    
    // Add search filter if provided
    if (searchParams.search) {
      query += " AND name LIKE ?"
      params.push(`%${searchParams.search}%`)
    }
    
    // Add state filter if provided
    if (searchParams.state) {
      query += " AND state = ?"
      params.push(searchParams.state)
    }
    
    // Add rating filter if provided
    if (searchParams.rtg) {
      query += " AND rating >= ?"
      params.push(Number(searchParams.rtg))
    }
    
    // Add ordering
    query += " ORDER BY rating DESC"
    
    // Add pagination
    query += " LIMIT ? OFFSET ?"
    params.push(ITEMS_PER_PAGE, offset)
    
    // Execute the query
    const stmt = sqlite.prepare(query)
    const result = stmt.all(...params)
    
    return result.map(d => {
      // Parse metadata if it exists
      let metadata: any = {};
      try {
        if (d.metadata && typeof d.metadata === 'string') {
          metadata = JSON.parse(d.metadata);
        }
      } catch (err) {
        console.error("Error parsing metadata:", err);
      }
      
      // Get coordinates from the right columns - check both direct columns and metadata
      const lat = d.latitude !== undefined ? Number(d.latitude) : (metadata?.location?.lat || 0);
      const lng = d.longitude !== undefined ? Number(d.longitude) : (metadata?.location?.lng || 0);
      
      // For debugging
      console.log(`Dispensary DB Record ${d.id}: direct lat=${d.latitude}, lng=${d.longitude}`);
      
      // Generate a random Bangkok-area coordinate if no valid coordinates
      const randomLat = (Math.random() * 0.1) + 13.7;
      const randomLng = (Math.random() * 0.1) + 100.5;
      
      return {
        id: d.id,
        name: d.name,
        address: metadata?.address || '',
        city: d.city,
        state: d.state,
        phone_number: metadata?.phone || '',
        website: metadata?.website || '',
        rating: Number(d.rating) || 0,
        user_ratings_total: Number(d.review_count) || 0,
        latitude: (lat && !isNaN(lat) && lat !== 0) ? lat : randomLat,
        longitude: (lng && !isNaN(lng) && lng !== 0) ? lng : randomLng,
        image_url: d.image_url || '',
        description: d.description || '',
        // Add a dummy reviews array since the component expects it
        reviews: []
      }
    }) as Dispensary[]
  } catch (error) {
    console.error("Error fetching dispensaries with pagination:", error)
    throw new Error("Failed to fetch dispensaries")
  }
}

// Count total dispensaries matching search criteria
export async function estimateTotalDispensaries(searchParams: SearchParams): Promise<number> {
  try {
    // Build the base query
    let query = "SELECT COUNT(*) as count FROM dispensaries WHERE 1=1"
    const params: any[] = []
    
    // Add search filter if provided
    if (searchParams.search) {
      query += " AND name LIKE ?"
      params.push(`%${searchParams.search}%`)
    }
    
    // Add state filter if provided
    if (searchParams.state) {
      query += " AND state = ?"
      params.push(searchParams.state)
    }
    
    // Add rating filter if provided
    if (searchParams.rtg) {
      query += " AND rating >= ?"
      params.push(Number(searchParams.rtg))
    }
    
    // Execute the query
    const stmt = sqlite.prepare(query)
    const result = stmt.get(...params)
    
    return result?.count || 0
  } catch (error) {
    console.error("Error estimating total dispensaries:", error)
    throw new Error("Failed to estimate total dispensaries")
  }
}

// Fetch a single dispensary by ID
export async function getDispensaryById(id: string): Promise<Dispensary | null> {
  try {
    const stmt = sqlite.prepare("SELECT * FROM dispensaries WHERE id = ?")
    const result = stmt.get(id)
    
    if (!result) {
      return null
    }
    
    // Parse metadata if it exists
    let metadata: any = {};
    try {
      if (result.metadata && typeof result.metadata === 'string') {
        metadata = JSON.parse(result.metadata);
      }
    } catch (err) {
      console.error("Error parsing metadata:", err);
    }
    
    // Get coordinates from the right columns - check both direct columns and metadata
    const lat = result.latitude !== undefined ? Number(result.latitude) : (metadata?.location?.lat || 0);
    const lng = result.longitude !== undefined ? Number(result.longitude) : (metadata?.location?.lng || 0);
    
    // Generate a random Bangkok-area coordinate if no valid coordinates
    const randomLat = (Math.random() * 0.1) + 13.7;
    const randomLng = (Math.random() * 0.1) + 100.5;
    
    return {
      id: result.id,
      name: result.name,
      address: metadata?.address || '',
      city: result.city,
      state: result.state,
      phone_number: metadata?.phone || '',
      website: metadata?.website || '',
      rating: Number(result.rating) || 0,
      user_ratings_total: Number(result.review_count) || 0,
      latitude: (lat && !isNaN(lat) && lat !== 0) ? lat : randomLat,
      longitude: (lng && !isNaN(lng) && lng !== 0) ? lng : randomLng,
      image_url: result.image_url || '',
      description: result.description || '',
      // Add a dummy reviews array since the component expects it
      reviews: []
    } as Dispensary
  } catch (error) {
    console.error("Error fetching dispensary by ID:", error)
    throw new Error("Failed to fetch dispensary")
  }
}

