import { NextResponse } from 'next/server';
import { CosmosClient } from '@azure/cosmos';

// Connection and validation will be done inside the handler functions
// to prevent issues during build time

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const swingId = searchParams.get('swingId');

  if (!swingId) {
    return NextResponse.json(
      { error: 'Missing swingId parameter' },
      { status: 400 }
    );
  }

  try {
    // Validate required environment variables
    if (!process.env.COSMOS_ENDPOINT) {
      throw new Error('COSMOS_ENDPOINT environment variable is required');
    }

    if (!process.env.COSMOS_KEY) {
      throw new Error('COSMOS_KEY environment variable is required');
    }

    if (!process.env.COSMOS_DATABASE_ID) {
      throw new Error('COSMOS_DATABASE_ID environment variable is required');
    }

    if (!process.env.COSMOS_CONTAINER_ID) {
      throw new Error('COSMOS_CONTAINER_ID environment variable is required');
    }

    // Cosmos DB connection configuration
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    const databaseId = process.env.COSMOS_DATABASE_ID;
    const containerId = process.env.COSMOS_CONTAINER_ID;

    // Initialize the Cosmos client
    const client = new CosmosClient({ endpoint, key });
    const database = client.database(databaseId);
    const container = database.container(containerId);
    
    // Find which session contains this swing
    const querySpec = {
      query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.swings, { 'id': @swingId }, true)",
      parameters: [{ name: "@swingId", value: swingId }]
    };
    
    const { resources: sessions } = await container.items.query(querySpec).fetchAll();
    
    if (sessions.length === 0) {
      return NextResponse.json(
        { error: 'No session found containing the specified swing' },
        { status: 404 }
      );
    }
    
    // Return the session data
    return NextResponse.json(sessions[0], { status: 200 });
  } catch (error) {
    console.error('Error finding session for swing:', error);
    return NextResponse.json(
      { error: 'Failed to find session for swing' },
      { status: 500 }
    );
  }
}