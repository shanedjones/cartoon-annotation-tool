import { NextResponse } from 'next/server';
import { CosmosClient } from '@azure/cosmos';

// Connection and validation will be done inside the handler functions
// to prevent issues during build time

export async function PUT(request: Request) {
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

    const data = await request.json();
    const { sessionId, swing } = data;
    
    if (!sessionId || !swing || !swing.id) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, swing.id' },
        { status: 400 }
      );
    }
    
    // Get the existing session
    const { resource: session } = await container.item(sessionId, sessionId).read();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Find and update the swing within the session
    const swingIndex = session.swings.findIndex((s: any) => s.id === swing.id);
    
    if (swingIndex === -1) {
      return NextResponse.json(
        { error: 'Swing not found in session' },
        { status: 404 }
      );
    }
    
    // Update the swing
    session.swings[swingIndex] = swing;
    
    // Update the session
    const { resource: updatedSession } = await container.item(sessionId, sessionId).replace(session);
    
    return NextResponse.json(updatedSession, { status: 200 });
  } catch (error) {
    console.error('Error updating swing in session:', error);
    return NextResponse.json(
      { error: 'Failed to update swing in session' },
      { status: 500 }
    );
  }
}