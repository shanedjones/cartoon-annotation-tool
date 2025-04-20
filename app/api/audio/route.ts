import { NextRequest, NextResponse } from 'next/server';
import { uploadAudioBlob, ensureContainer } from '@/utils/azureStorage';

// Container initialization will be done at runtime during the first request

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Ensure container exists at runtime, during the request
    try {
      await ensureContainer();
      console.log('Container initialization successful');
    } catch (err) {
      console.error('Failed to initialize Azure Storage container:', err);
      return NextResponse.json(
        { error: `Failed to initialize storage: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    
    if (!audioFile || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: audio, sessionId' },
        { status: 400 }
      );
    }
    
    // Convert File to Blob
    const audioBuffer = await audioFile.arrayBuffer();
    
    if (!audioBuffer) {
      console.error('Failed to get array buffer from file');
      return NextResponse.json(
        { error: 'Failed to process audio file' },
        { status: 500 }
      );
    }
    
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type });
    
    // Upload the audio blob to Azure Storage
    const blobUrl = await uploadAudioBlob(audioBlob, sessionId);
    
    // Return the blob URL
    return NextResponse.json({ url: blobUrl }, { status: 200 });
  } catch (error) {
    console.error('Error uploading audio blob:', error);
    return NextResponse.json(
      { error: 'Failed to upload audio blob' },
      { status: 500 }
    );
  }
}