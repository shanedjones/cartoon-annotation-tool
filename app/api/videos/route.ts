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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');

  try {
    let querySpec;
    
    if (id) {
      // Fetch specific video by ID
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
      // Get all videos
      querySpec = {
        query: "SELECT * FROM c"
      };
    }

    const { resources: videos } = await container.items.query(querySpec).fetchAll();
    
    return NextResponse.json(videos, { status: 200 });
  } catch (error) {
    console.error('Error fetching videos from Cosmos DB:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos from database' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const video = await request.json();
    
    // Validate required fields
    if (!video.title || !video.videoUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: title, videoUrl' },
        { status: 400 }
      );
    }
    
    // Ensure the video has an ID or generate one
    if (!video.id) {
      video.id = `video-${Date.now()}`;
    }
    
    // Add timestamp if not present
    if (!video.dateAdded) {
      video.dateAdded = new Date().toISOString().split('T')[0];
    }
    
    // Set default status if not provided
    if (!video.status) {
      video.status = 'Not Started';
    }
    
    const { resource: createdVideo } = await container.items.create(video);
    
    return NextResponse.json(createdVideo, { status: 201 });
  } catch (error) {
    console.error('Error creating video in Cosmos DB:', error);
    return NextResponse.json(
      { error: 'Failed to create video in database' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const video = await request.json();
    
    if (!video.id) {
      return NextResponse.json(
        { error: 'Missing video ID' },
        { status: 400 }
      );
    }
    
    // Get the existing item to preserve the _rid, _self properties required by Cosmos DB
    const { resource: existingVideo } = await container.item(video.id, video.id).read();
    
    if (!existingVideo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    // Update the status to "Completed" if a reviewSession is present and status isn't already "Archived"
    if (video.reviewSession && video.status !== "Archived") {
      video.status = "Completed";
    }
    
    const { resource: updatedVideo } = await container.item(video.id, video.id).replace(video);
    
    return NextResponse.json(updatedVideo, { status: 200 });
  } catch (error) {
    console.error('Error updating video in Cosmos DB:', error);
    return NextResponse.json(
      { error: 'Failed to update video in database' },
      { status: 500 }
    );
  }
}