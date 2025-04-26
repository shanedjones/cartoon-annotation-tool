import { NextResponse } from 'next/server';
import { getContainer } from '@/src/lib/db';

// Connection and validation will be done inside the handler functions
// to prevent issues during build time

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
    // Get container from the singleton client
    const container = getContainer();
    
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
        { notes: '' },
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
    // Get container from the singleton client
    const container = getContainer();
    
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
    
    // Update the status to "Completed" only when a review is saved
    // This is the only place where an assessment can be marked as complete
    session.status = "Completed";
    
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