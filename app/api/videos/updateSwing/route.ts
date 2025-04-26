import { NextResponse } from 'next/server';
import { getContainer } from '@/src/lib/db';

// Connection and validation will be done inside the handler functions
// to prevent issues during build time

export async function PUT(request: Request) {
  try {
    // Get container from the singleton client
    const container = getContainer();

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