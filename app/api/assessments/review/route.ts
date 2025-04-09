import { NextResponse } from 'next/server';
import { CosmosClient } from '@azure/cosmos';

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

// GET: Fetch an assessment review
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing sessionId parameter' },
      { status: 400 }
    );
  }

  try {
    // Get the existing session
    const { resource: session } = await container.item(sessionId, sessionId).read();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Assessment session not found' },
        { status: 404 }
      );
    }
    
    // Return the review data if it exists
    if (session.review) {
      return NextResponse.json(session.review, { status: 200 });
    } else {
      return NextResponse.json(
        { notes: '', focusAreas: [] },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error fetching assessment review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment review' },
      { status: 500 }
    );
  }
}

// POST: Save an assessment review
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { sessionId, review } = data;
    
    if (!sessionId || !review) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, review' },
        { status: 400 }
      );
    }
    
    // Get the existing session
    const { resource: session } = await container.item(sessionId, sessionId).read();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Assessment session not found' },
        { status: 404 }
      );
    }
    
    // Update the session with the review data
    session.review = review;
    
    // Save the updated session
    const { resource: updatedSession } = await container.item(sessionId, sessionId).replace(session);
    
    return NextResponse.json(updatedSession.review, { status: 200 });
  } catch (error) {
    console.error('Error saving assessment review:', error);
    return NextResponse.json(
      { error: 'Failed to save assessment review' },
      { status: 500 }
    );
  }
}