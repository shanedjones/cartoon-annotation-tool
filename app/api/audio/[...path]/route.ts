import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';
import { handleRouteError, handleBadRequest } from '@/src/utils/api';
export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'audio-recordings';
    if (!connectionString) {
      return handleRouteError(
        new Error('Missing connection string'),
        'audio storage configuration',
        'Azure Storage connection string not configured'
      );
    }
    const { params } = context;
    const blobName = Array.isArray(params.path) ? params.path.join('/') : '';
    if (!blobName) {
      return handleBadRequest('No blob path specified');
    }
    console.log(`Proxying request for blob: ${blobName}`);
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    const properties = await blobClient.getProperties();
    try {
      const downloadResponse = await blobClient.downloadToBuffer();
      if (!downloadResponse || downloadResponse.length === 0) {
        return handleRouteError(
          new Error('Empty or missing blob data'),
          'audio download',
          'Failed to download blob or empty blob'
        );
      }
      console.log(`Successfully downloaded blob: ${blobName}, size: ${downloadResponse.length} bytes`);
      const response = new NextResponse(downloadResponse);
      response.headers.set('Content-Type', properties.contentType || 'audio/webm');
      response.headers.set('Content-Length', properties.contentLength?.toString() || downloadResponse.length.toString());
      response.headers.set('Accept-Ranges', 'bytes');
      response.headers.set('Cache-Control', 'max-age=3600');
      return response;
    } catch (downloadError) {
      console.error('Error downloading blob:', downloadError);
      try {
        console.log('Trying alternative download approach...');
        const downloadUrl = blobClient.url;
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`Successfully downloaded blob using alternative method: ${blobName}, size: ${buffer.length} bytes`);
        const nextResponse = new NextResponse(buffer);
        nextResponse.headers.set('Content-Type', properties.contentType || 'audio/webm');
        nextResponse.headers.set('Content-Length', buffer.length.toString());
        nextResponse.headers.set('Accept-Ranges', 'bytes');
        nextResponse.headers.set('Cache-Control', 'max-age=3600');
        return nextResponse;
      } catch (altError) {
        return handleRouteError(
          altError,
          'audio download (alternative method)',
          'Failed to download blob using multiple methods'
        );
      }
    }
  } catch (error) {
    return handleRouteError(error, 'audio proxy', 'Failed to proxy blob');
  }
}