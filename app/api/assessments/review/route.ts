import { NextResponse } from 'next/server';
import { getContainer } from '@/src/lib/db';
import { handleRouteError, handleBadRequest, handleNotFound } from '@/src/utils/api';

// Connection and validation will be done inside the handler functions
// to prevent issues during build time

// GET: Fetch an assessment review
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return handleBadRequest('Missing sessionId parameter');
  }

  try {
    // Get container from the singleton client
    const container = getContainer();
    
    // Get the existing session
    const { resource: session } = await container.item(sessionId, sessionId).read();
    
    if (!session) {
      return handleNotFound('Assessment session');
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
    return handleRouteError(error, 'assessment review fetch');
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
      return handleBadRequest('Missing required fields: sessionId, review');
    }
    
    // Get the existing session
    const { resource: session } = await container.item(sessionId, sessionId).read();
    
    if (!session) {
      return handleNotFound('Assessment session');
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
    return handleRouteError(error, 'assessment review save');
  }
}