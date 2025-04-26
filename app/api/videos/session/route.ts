import { NextResponse } from 'next/server';
import { getContainer } from '@/src/lib/db';
import { handleRouteError, handleBadRequest, handleNotFound } from '@/src/utils/api';

// Connection and validation will be done inside the handler functions
// to prevent issues during build time

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const swingId = searchParams.get('swingId');

  if (!swingId) {
    return handleBadRequest('Missing swingId parameter');
  }

  try {
    // Get container from singleton client
    const container = getContainer();
    
    // Find which session contains this swing
    const querySpec = {
      query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.swings, { 'id': @swingId }, true)",
      parameters: [{ name: "@swingId", value: swingId }]
    };
    
    const { resources: sessions } = await container.items.query(querySpec).fetchAll();
    
    if (sessions.length === 0) {
      return handleNotFound('Session containing the specified swing');
    }
    
    // Return the session data
    return NextResponse.json(sessions[0], { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'session lookup');
  }
}