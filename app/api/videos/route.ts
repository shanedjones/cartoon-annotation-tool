import { NextResponse } from 'next/server';
import { getContainer } from '@/src/lib/db';
import { handleRouteError, handleBadRequest, handleNotFound } from '@/src/utils/api';
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  try {
    const container = getContainer();
    let querySpec;
    if (id) {
      querySpec = {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: id }]
      };
    } else if (status && status !== 'All') {
      querySpec = {
        query: "SELECT * FROM c WHERE c.status = @status",
        parameters: [{ name: "@status", value: status }]
      };
    } else {
      querySpec = {
        query: "SELECT * FROM c"
      };
    }
    const { resources: sessions } = await container.items.query(querySpec).fetchAll();
    if (id && sessions.length === 0) {
      const swingQuerySpec = {
        query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.swings, { 'id': @swingId }, true)",
        parameters: [{ name: "@swingId", value: id }]
      };
      const { resources: sessionWithSwing } = await container.items.query(swingQuerySpec).fetchAll();
      if (sessionWithSwing.length > 0) {
        const session = sessionWithSwing[0];
        const swing = session.swings.find((s: any) => s.id === id);
        if (swing) {
          return NextResponse.json([swing], { status: 200 });
        }
      }
    }
    return NextResponse.json(sessions, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'video data fetch');
  }
}
export async function POST(request: Request) {
  try {
    const container = getContainer();
    const data = await request.json();
    if (data.athlete) {
      if (!data.athlete.name || !data.date || !data.timeWindow) {
        return handleBadRequest('Missing required fields for session: athlete.name, date, timeWindow');
      }
      if (!data.id) {
        data.id = `session-${Date.now()}`;
      }
      if (!data.status) {
        data.status = 'Not Started';
      }
      if (!data.swings) {
        data.swings = [];
      }
      const { resource: createdSession } = await container.items.create(data);
      return NextResponse.json(createdSession, { status: 201 });
    } else {
      if (!data.title || !data.videoUrl) {
        return handleBadRequest('Missing required fields: title, videoUrl');
      }
      if (!data.id) {
        data.id = `swing-${Date.now()}`;
      }
      if (!data.dateAdded) {
        data.dateAdded = new Date().toISOString().split('T')[0];
      }
      if (!data.status) {
        data.status = 'Not Started';
      }
      const { resource: createdSwing } = await container.items.create(data);
      return NextResponse.json(createdSwing, { status: 201 });
    }
  } catch (error) {
    return handleRouteError(error, 'video data creation');
  }
}
export async function PUT(request: Request) {
  try {
    const container = getContainer();
    const data = await request.json();
    if (!data.id) {
      return handleBadRequest('Missing ID');
    }
    const isSession = !!data.athlete;
    const { resource: existingItem } = await container.item(data.id, data.id).read();
    if (!existingItem) {
      return handleNotFound('Item');
    }
    if (isSession) {
      if (data.swings && data.swings.every((swing: any) => swing.status === 'Completed')) {
        data.status = 'Completed';
      }
    } else {
      if (data.reviewSession && data.status !== 'Archived') {
        data.status = 'Completed';
        const swingId = data.id;
        const sessionQuerySpec = {
          query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.swings, { 'id': @swingId }, true)",
          parameters: [{ name: "@swingId", value: swingId }]
        };
        const { resources: sessionsWithSwing } = await container.items.query(sessionQuerySpec).fetchAll();
        if (sessionsWithSwing.length > 0) {
          const session = sessionsWithSwing[0];
          const swingIndex = session.swings.findIndex((s: any) => s.id === swingId);
          if (swingIndex !== -1) {
            session.swings[swingIndex] = data;
            if (session.swings.every((s: any) => s.status === 'Completed')) {
              session.status = 'Completed';
            }
            await container.item(session.id, session.id).replace(session);
          }
        }
      }
    }
    const { resource: updatedItem } = await container.item(data.id, data.id).replace(data);
    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'video data update');
  }
}