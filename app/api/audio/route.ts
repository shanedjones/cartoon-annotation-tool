import { NextRequest, NextResponse } from 'next/server';
import { uploadAudioBlob, ensureContainer } from '@/src/utils/azureStorage';
import { handleRouteError, handleBadRequest } from '@/src/utils/api';

// Container initialization will be done at runtime during the first request

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Ensure container exists at runtime, during the request
    try {
      await ensureContainer();
      console.log('Container initialization successful');
    } catch (err) {
      return handleRouteError(err, 'storage initialization', 'Failed to initialize storage');
    }

    // Get the form data from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    
    if (!audioFile || !sessionId) {
      return handleBadRequest('Missing required fields: audio, sessionId');
    }
    
    // Convert File to Blob
    const audioBuffer = await audioFile.arrayBuffer();
    
    if (!audioBuffer) {
      return handleRouteError(
        new Error('Failed to get array buffer from file'),
        'audio processing',
        'Failed to process audio file'
      );
    }
    
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type });
    
    // Upload the audio blob to Azure Storage
    const blobUrl = await uploadAudioBlob(audioBlob, sessionId);
    
    // Return the blob URL
    return NextResponse.json({ url: blobUrl }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'audio upload', 'Failed to upload audio blob');
  }
}