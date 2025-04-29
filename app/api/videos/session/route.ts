import { NextResponse } from 'next/server';
import { getContainer } from '@/src/lib/db';
import { handleRouteError, handleBadRequest, handleNotFound } from '@/src/utils/api';
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const swingId = searchParams.get('swingId');
  if (!swingId) {
    return handleBadRequest('Missing swingId parameter');
  }
  try {
    const container = getContainer();
    const querySpec = {
      query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.swings, { 'id': @swingId }, true)",
      parameters: [{ name: "@swingId", value: swingId }]
    };
    const { resources: sessions } = await container.items.query(querySpec).fetchAll();
    if (sessions.length === 0) {
      return handleNotFound('Session containing the specified swing');
    }
    return NextResponse.json(sessions[0], { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'session lookup');
  }
}