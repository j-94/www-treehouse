import { db, initializeDatabase } from "./index";
import { dispensaries } from "./schema";
import { sql } from "drizzle-orm";

// List of major cities in Thailand
const SEARCH_LOCATIONS = [
  { city: "Bangkok", state: "Thailand" },
  { city: "Chiang Mai", state: "Thailand" },
  { city: "Phuket", state: "Thailand" },
  { city: "Pattaya", state: "Thailand" },
  { city: "Koh Samui", state: "Thailand" },
  { city: "Krabi", state: "Thailand" }
];

// Specific queries for Thai cannabis stores
const CANNABIS_QUERIES = [
  'weed shop',
  'cannabis dispensary',
  'marijuana shop',
  'cannabis cafe',
  'cannabis club',
  'ganja shop',
  'hemp shop'
];

interface BusinessReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
}

interface BusinessResponse {
  name: string;
  address: string;
  phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  photos?: string[];
  opening_hours?: {
    weekday_text?: string[];
  };
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  reviews?: BusinessReview[];
}

let isShuttingDown = false;

// Add signal handlers
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

function handleShutdown() {
  if (isShuttingDown) {
    console.log('\nForce quitting...');
    process.exit(1);
  }
  
  console.log('\nGracefully shutting down...');
  isShuttingDown = true;
}

async function fetchDispensaryData() {
  console.log("Initializing database...");
  console.log("Fetching cannabis store data from Business Search API...");

  const allDispensaries = new Set<string>();
  const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds delay
  const MAX_RETRIES = 3;

  // Create cache directory if it doesn't exist
  try {
    await Bun.mkdir("cache/responses", { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
  }
  
  for (const location of SEARCH_LOCATIONS) {
    if (isShuttingDown) {
      console.log('Shutdown requested, stopping data fetch...');
      break;
    }

    for (const query of CANNABIS_QUERIES) {
      if (isShuttingDown) break;

      let retries = 0;
      let success = false;

      while (retries < MAX_RETRIES && !success && !isShuttingDown) {
        console.log(`Searching for ${query} in ${location.city}, ${location.state}... (Attempt ${retries + 1}/${MAX_RETRIES})`);
        
        try {
          // Add delay before request
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));

          const response = await fetch(
            `https://business-search2.p.rapidapi.com/search?query=${encodeURIComponent(query)}&city=${encodeURIComponent(location.city)}&state=${encodeURIComponent(location.state)}`,
            {
              headers: {
                'X-RapidAPI-Host': 'business-search2.p.rapidapi.com',
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || ''
              }
            }
          );

          // Save raw response
          const responseData = await response.text();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const cacheFile = `cache/responses/${location.city}_${query}_${timestamp}.json`;
          await Bun.write(cacheFile, responseData);
          console.log(`Cached response to ${cacheFile}`);

          if (response.status === 429) { // Too Many Requests
            console.log('Rate limit hit, waiting longer before retry...');
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS * 2));
            retries++;
            continue;
          }

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('API Key is invalid or missing. Please check your RAPID_API_KEY environment variable.');
            }
            console.error(`Error fetching data for ${location.city}: ${response.statusText}`);
            break;
          }

          const data = JSON.parse(responseData) as BusinessResponse[];
          console.log(`Found ${data.length} results for ${query} in ${location.city}`);

          for (const business of data) {
            // Skip if not cannabis-related based on name/reviews
            const name = business.name.toLowerCase();
            if (!name.includes('weed') && 
                !name.includes('cannabis') && 
                !name.includes('marijuana') && 
                !name.includes('ganja') && 
                !name.includes('dispensary')) {
              continue;
            }

            const dispensary = {
              name: business.name,
              city: location.city,
              state: location.state,
              description: `Cannabis dispensary located in ${business.address}`,
              rating: business.rating || 0,
              review_count: business.user_ratings_total || 0,
              image_url: business.photos?.[0] || '',
              metadata: JSON.stringify({
                address: business.address || '',
                phone: business.phone_number || '',
                website: business.website || '',
                hours: business.opening_hours?.weekday_text?.join(', ') || '',
                latitude: business.geometry?.location?.lat || 0,
                longitude: business.geometry?.location?.lng || 0,
                categories: ['Cannabis', 'Dispensary'],
                reviews: business.reviews?.map(review => ({
                  author: review.author_name,
                  rating: review.rating,
                  text: review.text,
                  date: review.time
                })) || []
              })
            };

            // Use stringified object as key to avoid duplicates
            allDispensaries.add(JSON.stringify(dispensary));
          }

          success = true;

        } catch (error) {
          if (error instanceof Error) {
            console.error(`Error fetching data for ${query} in ${location.city}:`, error);
            if (error.message.includes('API Key')) {
              throw error; // Stop execution if API key is invalid
            }
          } else {
            console.error(`Unknown error fetching data for ${query} in ${location.city}`);
          }
          retries++;
          if (retries < MAX_RETRIES) {
            console.log(`Retrying in ${DELAY_BETWEEN_REQUESTS/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
          }
        }
      }

      if (isShuttingDown) {
        break;
      }

      if (!success) {
        console.log(`Failed to fetch data for ${query} in ${location.city} after ${MAX_RETRIES} attempts`);
      }
    }
  }

  return Array.from(allDispensaries).map(str => JSON.parse(str));
}

async function seed() {
  console.log("Initializing database...");
  initializeDatabase();

  try {
    const dispensaryData = await fetchDispensaryData();
    if (isShuttingDown) {
      console.log('Shutdown requested, stopping seed process...');
      return;
    }

    console.log(`\nSeeding ${dispensaryData.length} unique cannabis stores...`);
    
    for (const dispensary of dispensaryData) {
      if (isShuttingDown) {
        console.log('Shutdown requested, stopping database insertion...');
        break;
      }

      console.log(`Inserting dispensary: ${dispensary.name}`);
      try {
        await db.insert(dispensaries).values(dispensary);
        console.log(`Successfully inserted ${dispensary.name}`);
      } catch (error) {
        console.error(`Error inserting ${dispensary.name}:`, error);
      }
    }

    if (!isShuttingDown) {
      // Verify the data was inserted
      const count = await db.select({ count: sql`count(*)` }).from(dispensaries);
      console.log(`\nVerification: ${count[0].count} records in database`);
      console.log("Seed completed successfully!");
    }
  } catch (error) {
    if (!isShuttingDown) {
      console.error("Error seeding database:", error);
      throw error;
    }
  }
}

seed().catch(error => {
  if (!isShuttingDown) {
    console.error("Seed script failed:", error);
    process.exit(1);
  }
}); 