import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, handleBadRequest } from '@/src/utils/api';

export async function GET(
  request: NextRequest,
) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return handleBadRequest('No video URL specified');
    }
    
    // Create a fetch request that doesn't include range headers
    const fetchResponse = await fetch(url, {
      headers: {
        // Explicitly avoid sending Range headers
        'Accept': '*/*',
      },
    });
    
    if (!fetchResponse.ok) {
      return handleRouteError(
        new Error(`Failed to fetch video: ${fetchResponse.status} ${fetchResponse.statusText}`),
        'video proxy',
        'Failed to fetch video from source URL'
      );
    }
    
    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a response that explicitly doesn't support ranges
    const response = new NextResponse(buffer);
    
    // Get the content type from the original response or default to video/mp4
    const contentType = fetchResponse.headers.get('Content-Type') || 'video/mp4';
    response.headers.set('Content-Type', contentType);
    response.headers.set('Content-Length', buffer.length.toString());
    
    // Explicitly inform clients that range requests are not supported
    response.headers.set('Accept-Ranges', 'none');
    
    // Set cache headers
    response.headers.set('Cache-Control', 'max-age=3600');
    
    return response;
  } catch (error) {
    return handleRouteError(error, 'video proxy', 'Failed to proxy video');
  }
}