# Neon Database Integration for Treehouse

This document describes the Neon PostgreSQL database integration for the Treehouse application.

## Overview

Treehouse now supports two database backends:
1. SQLite (via better-sqlite3) for local development
2. Neon PostgreSQL for production

## Setup

1. Create a Neon account and database at https://neon.tech
2. Add your Neon connection string to `.env.local`:
   ```
   NEON_DATABASE_URL=postgresql://user:password@ep-your-endpoint.eu-central-1.aws.neon.tech/dbname?sslmode=require
   ```

## Testing the Neon Integration

The application includes a test page at `/neon-test` that allows you to:
1. Test the Neon database connection
2. Initialize the database schema
3. Seed the database with dispensary data
4. View the dispensaries stored in the Neon database

## API Endpoints

The following API endpoints are available for interacting with the Neon database:

1. **Test Connection**: `GET /api/neon-test`
   - Tests connection to Neon database
   - Initializes database schema if possible

2. **Seed Database**: `POST /api/neon-seed`
   - Seeds the Neon database with dispensary data
   - Fetches data from the RapidAPI endpoint

3. **Get Dispensaries**: `GET /api/neon-dispensaries`
   - Retrieves dispensaries from the Neon database
   - Supports filtering and pagination

## Implementation Details

### Database Connection
- Connection is handled by `@neondatabase/serverless` 
- We use the `neon()` function to create a SQL connection
- Drizzle ORM is used with the `drizzle-orm/neon-http` adapter

### Schema
- The `dispensaries` table is created with columns for all dispensary properties
- Location data is stored in `latitude` and `longitude` columns
- Additional data is stored in a JSONB `metadata` column

### Switching Between Databases
- The application checks for the `NEON_DATABASE_URL` environment variable
- If present, it uses Neon for database operations
- Otherwise, it falls back to SQLite

## Future Improvements

1. Add a toggle in the UI to switch between databases
2. Implement data sync between SQLite and Neon
3. Add user authentication with Neon database storage
4. Implement more advanced search features using PostgreSQL's full-text search