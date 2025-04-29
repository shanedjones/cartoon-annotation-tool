import { NextResponse } from 'next/server';
import { getContainer } from '@/src/lib/db';
import { handleRouteError, handleBadRequest, handleNotFound } from '@/src/utils/api';
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) {
    return handleBadRequest('Missing sessionId parameter');
  }
  try {
    const container = getContainer();
    const { resource: session } = await container.item(sessionId, sessionId).read();
    if (!session) {
      return handleNotFound('Assessment session');
    }
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
export async function POST(request: Request) {
  try {
    const container = getContainer();
    const data = await request.json();
    const { sessionId, review } = data;
    if (!sessionId || !review) {
      return handleBadRequest('Missing required fields: sessionId, review');
    }
    const { resource: session } = await container.item(sessionId, sessionId).read();
    if (!session) {
      return handleNotFound('Assessment session');
    }
    session.review = review;
    session.status = "Completed";
    const { resource: updatedSession } = await container.item(sessionId, sessionId).replace(session);
    return NextResponse.json(updatedSession.review, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'assessment review save');
  }
}