import { NextResponse } from 'next/server';
import { getContainer } from '@/src/lib/db';
import { handleRouteError, handleBadRequest, handleNotFound } from '@/src/utils/api';

// Connection and validation will be done inside the handler functions
// to prevent issues during build time

export async function PUT(request: Request) {
  try {
    // Get container from the singleton client
    const container = getContainer();

    const data = await request.json();
    const { sessionId, swing } = data;
    
    if (!sessionId || !swing || !swing.id) {
      return handleBadRequest('Missing required fields: sessionId, swing.id');
    }
    
    // Get the existing session
    const { resource: session } = await container.item(sessionId, sessionId).read();
    
    if (!session) {
      return handleNotFound('Session');
    }
    
    // Find and update the swing within the session
    const swingIndex = session.swings.findIndex((s: any) => s.id === swing.id);
    
    if (swingIndex === -1) {
      return handleNotFound('Swing in session');
    }
    
    // Update the swing
    session.swings[swingIndex] = swing;
    
    // Update the session
    const { resource: updatedSession } = await container.item(sessionId, sessionId).replace(session);
    
    return NextResponse.json(updatedSession, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'swing update');
  }
}