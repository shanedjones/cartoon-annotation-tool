import { NextResponse } from 'next/server';
import { getContainer } from '@/src/lib/db';
import { handleRouteError, handleBadRequest, handleNotFound } from '@/src/utils/api';
export async function PUT(request: Request) {
  try {
    const container = getContainer();
    const data = await request.json();
    const { sessionId, swing } = data;
    if (!sessionId || !swing || !swing.id) {
      return handleBadRequest('Missing required fields: sessionId, swing.id');
    }
    const { resource: session } = await container.item(sessionId, sessionId).read();
    if (!session) {
      return handleNotFound('Session');
    }
    const swingIndex = session.swings.findIndex((s: any) => s.id === swing.id);
    if (swingIndex === -1) {
      return handleNotFound('Swing in session');
    }
    session.swings[swingIndex] = swing;
    const { resource: updatedSession } = await container.item(sessionId, sessionId).replace(session);
    return NextResponse.json(updatedSession, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'swing update');
  }
}