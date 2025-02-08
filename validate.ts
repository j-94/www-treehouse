import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sql } from "drizzle-orm";
import { dispensaries } from "./src/lib/db/schema";

const db = new Database("dispensaries.db");
const drizzleDb = drizzle(db);

// Test data that matches our schema
const testDispensary = {
  name: "Test Cannabis Shop",
  city: "Bangkok",
  state: "Thailand",
  image_url: "https://example.com/image.jpg",
  description: "Test cannabis dispensary in Bangkok",
  rating: 4.5,
  review_count: 100,
  metadata: JSON.stringify({
    address: "123 Test Street, Bangkok",
    phone: "+66123456789",
    website: "https://example.com",
    hours: "Mon-Sun: 9:00 AM - 10:00 PM",
    latitude: 13.7563,
    longitude: 100.5018,
    categories: ["Cannabis", "Dispensary"],
    reviews: [{
      author: "Test User",
      rating: 5,
      text: "Great shop!",
      date: Date.now()
    }]
  })
};

async function validateSchema() {
  console.log("Current schema:");
  const schema = await db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='dispensaries'").all();
  console.log(JSON.stringify(schema, null, 2));
  
  console.log("\nTrying to insert test data...");
  try {
    const result = await drizzleDb.insert(dispensaries).values(testDispensary);
    console.log("Success! Test data inserted.");
    
    console.log("\nRetrieving inserted data:");
    const inserted = await drizzleDb.select().from(dispensaries).where(sql`id = (SELECT MAX(id) FROM dispensaries)`);
    console.log(JSON.stringify(inserted[0], null, 2));
    
    // Also check the metadata parsing
    const metadata = JSON.parse(inserted[0].metadata as string);
    console.log("\nParsed metadata:");
    console.log(JSON.stringify(metadata, null, 2));
    
    // Cleanup
    await drizzleDb.delete(dispensaries).where(sql`id = (SELECT MAX(id) FROM dispensaries)`);
    console.log("\nTest data cleaned up.");
  } catch (error) {
    console.error("Error:", error);
    console.log("\nExpected schema:", Object.keys(testDispensary));
    console.log("Test data:", JSON.stringify(testDispensary, null, 2));
  } finally {
    db.close();
  }
}

validateSchema().catch(console.error); 