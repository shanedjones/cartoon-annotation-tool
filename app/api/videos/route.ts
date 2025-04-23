import { NextResponse } from 'next/server';
// import { CosmosClient } from '@azure/cosmos';
import { initCosmosConnection } from '../../../src/utils/cosmosDb';

// Connection and validation will be done inside the handler functions
// to prevent issues during build time

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');

  try {
    // Initialize Cosmos DB connection using the utility function
    const container = initCosmosConnection();
    
    let querySpec;
    
    if (id) {
      // Fetch specific session or swing by ID
      querySpec = {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: id }]
      };
    } else if (status && status !== 'All') {
      // Filter by status
      querySpec = {
        query: "SELECT * FROM c WHERE c.status = @status",
        parameters: [{ name: "@status", value: status }]
      };
    } else {
      // Get all sessions
      querySpec = {
        query: "SELECT * FROM c"
      };
    }

    const { resources: sessions } = await container.items.query(querySpec).fetchAll();
    
    // For individual swing access, check if the ID is a swing within a session
    if (id && sessions.length === 0) {
      // Try to find a session containing the requested swing ID
      const swingQuerySpec = {
        query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.swings, { 'id': @swingId }, true)",
        parameters: [{ name: "@swingId", value: id }]
      };
      
      const { resources: sessionWithSwing } = await container.items.query(swingQuerySpec).fetchAll();
      
      if (sessionWithSwing.length > 0) {
        // Extract just the requested swing from the session
        // Define the Swing interface
        interface Swing {
          id: string;
          status?: string;
          [key: string]: unknown;
        }
        
        const session = sessionWithSwing[0];
        const swing = session.swings.find((s: Swing) => s.id === id);
        
        if (swing) {
          return NextResponse.json([swing], { status: 200 });
        }
      }
    }
    
    const response = NextResponse.json(sessions, { status: 200 });
    // Add cache control headers
    response.headers.set('Cache-Control', 'public, max-age=3600');
    return response;
  } catch (error) {
    console.error('Error fetching data from Cosmos DB:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from database' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Initialize Cosmos DB connection using the utility function
    const container = initCosmosConnection();
    
    const data = await request.json();
    
    // Check if we're submitting a session or an individual swing
    if (data.athlete) {
      // Validate session required fields
      if (!data.athlete.name || !data.date || !data.timeWindow) {
        return NextResponse.json(
          { error: 'Missing required fields for session: athlete.name, date, timeWindow' },
          { status: 400 }
        );
      }
      
      // Ensure the session has an ID or generate one
      if (!data.id) {
        data.id = `session-${Date.now()}`;
      }
      
      // Set default status if not provided
      if (!data.status) {
        data.status = 'Not Started';
      }
      
      // Ensure swings array exists
      if (!data.swings) {
        data.swings = [];
      }
      
      const { resource: createdSession } = await container.items.create(data);
      return NextResponse.json(createdSession, { status: 201 });
    } else {
      // We're submitting an individual swing
      // Validate required fields
      if (!data.title || !data.videoUrl) {
        return NextResponse.json(
          { error: 'Missing required fields: title, videoUrl' },
          { status: 400 }
        );
      }
      
      // Ensure the swing has an ID or generate one
      if (!data.id) {
        data.id = `swing-${Date.now()}`;
      }
      
      // Add timestamp if not present
      if (!data.dateAdded) {
        data.dateAdded = new Date().toISOString().split('T')[0];
      }
      
      // Set default status if not provided
      if (!data.status) {
        data.status = 'Not Started';
      }
      
      const { resource: createdSwing } = await container.items.create(data);
      return NextResponse.json(createdSwing, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating data in Cosmos DB:', error);
    return NextResponse.json(
      { error: 'Failed to create data in database' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Initialize Cosmos DB connection using the utility function
    const container = initCosmosConnection();
    
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'Missing ID' },
        { status: 400 }
      );
    }
    
    // Check if this is a session update or a swing update
    const isSession = !!data.athlete;
    
    // Get the existing item to preserve the _rid, _self properties required by Cosmos DB
    const { resource: existingItem } = await container.item(data.id, data.id).read();
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Update status based on specific conditions
    if (isSession) {
      // For sessions, check if all swings are completed
      interface Swing {
        id: string;
        status: string;
        [key: string]: unknown;
      }
      
      if (data.swings && data.swings.every((swing: Swing) => swing.status === 'Completed')) {
        data.status = 'Completed';
      }
    } else {
      // For individual swings, check if reviewSession is present
      if (data.reviewSession && data.status !== 'Archived') {
        data.status = 'Completed';
        
        // If this is a swing within a session, we need to update the session's swing
        const swingId = data.id;
        const sessionQuerySpec = {
          query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.swings, { 'id': @swingId }, true)",
          parameters: [{ name: "@swingId", value: swingId }]
        };
        
        const { resources: sessionsWithSwing } = await container.items.query(sessionQuerySpec).fetchAll();
        
        if (sessionsWithSwing.length > 0) {
          const session = sessionsWithSwing[0];
          
          // Update the swing within the session
          interface Swing {
            id: string;
            status: string;
            [key: string]: unknown;
          }
            
          const swingIndex = session.swings.findIndex((s: Swing) => s.id === swingId);
          if (swingIndex !== -1) {
            session.swings[swingIndex] = data;
            
            // Check if all swings are completed to update session status
            if (session.swings.every((s: Swing) => s.status === 'Completed')) {
              session.status = 'Completed';
            }
            
            // Update the session with the modified swing
            await container.item(session.id, session.id).replace(session);
          }
        }
      }
    }
    
    // Update the main item
    const { resource: updatedItem } = await container.item(data.id, data.id).replace(data);
    
    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error('Error updating data in Cosmos DB:', error);
    return NextResponse.json(
      { error: 'Failed to update data in database' },
      { status: 500 }
    );
  }
}