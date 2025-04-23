import { NextResponse } from 'next/server';
import { initCosmosConnection } from '../../../../src/utils/cosmosDb';

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
    // Initialize Cosmos DB connection using the utility function
    const container = initCosmosConnection();
    
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
    
    // Return the session data with caching headers
    const response = NextResponse.json(sessions[0], { status: 200 });
    response.headers.set('Cache-Control', 'public, max-age=3600');
    return response;
  } catch (error) {
    console.error('Error finding session for swing:', error);
    return NextResponse.json(
      { error: 'Failed to find session for swing' },
      { status: 500 }
    );
  }
}