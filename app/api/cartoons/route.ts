import { NextResponse } from 'next/server';
import { CosmosClient } from '@azure/cosmos';

// Cosmos DB connection configuration
const endpoint = process.env.COSMOS_ENDPOINT || '';
const key = process.env.COSMOS_KEY || '';
const databaseId = process.env.COSMOS_DATABASE_ID || 'cartoon-db';
const containerId = process.env.COSMOS_CONTAINER_ID || 'cartoons';

// Initialize the Cosmos client
const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');

  try {
    let querySpec;
    
    if (id) {
      // Fetch specific cartoon by ID
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
      // Get all cartoons
      querySpec = {
        query: "SELECT * FROM c"
      };
    }

    const { resources: cartoons } = await container.items.query(querySpec).fetchAll();
    
    return NextResponse.json(cartoons, { status: 200 });
  } catch (error) {
    console.error('Error fetching cartoons from Cosmos DB:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cartoons from database' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cartoon = await request.json();
    
    // Validate required fields
    if (!cartoon.title || !cartoon.videoUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: title, videoUrl' },
        { status: 400 }
      );
    }
    
    // Ensure the cartoon has an ID or generate one
    if (!cartoon.id) {
      cartoon.id = `cartoon-${Date.now()}`;
    }
    
    // Add timestamp if not present
    if (!cartoon.dateAdded) {
      cartoon.dateAdded = new Date().toISOString().split('T')[0];
    }
    
    // Set default status if not provided
    if (!cartoon.status) {
      cartoon.status = 'Not Started';
    }
    
    const { resource: createdCartoon } = await container.items.create(cartoon);
    
    return NextResponse.json(createdCartoon, { status: 201 });
  } catch (error) {
    console.error('Error creating cartoon in Cosmos DB:', error);
    return NextResponse.json(
      { error: 'Failed to create cartoon in database' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const cartoon = await request.json();
    
    if (!cartoon.id) {
      return NextResponse.json(
        { error: 'Missing cartoon ID' },
        { status: 400 }
      );
    }
    
    // Get the existing item to preserve the _rid, _self properties required by Cosmos DB
    const { resource: existingCartoon } = await container.item(cartoon.id, cartoon.id).read();
    
    if (!existingCartoon) {
      return NextResponse.json(
        { error: 'Cartoon not found' },
        { status: 404 }
      );
    }
    
    // Update the status to "Completed" if a reviewSession is present and status isn't already "Archived"
    if (cartoon.reviewSession && cartoon.status !== "Archived") {
      cartoon.status = "Completed";
    }
    
    const { resource: updatedCartoon } = await container.item(cartoon.id, cartoon.id).replace(cartoon);
    
    return NextResponse.json(updatedCartoon, { status: 200 });
  } catch (error) {
    console.error('Error updating cartoon in Cosmos DB:', error);
    return NextResponse.json(
      { error: 'Failed to update cartoon in database' },
      { status: 500 }
    );
  }
}