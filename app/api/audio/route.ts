import { NextRequest, NextResponse } from 'next/server';
import { uploadAudioBlob, ensureContainer } from '@/src/utils/azureStorage';
import { handleRouteError, handleBadRequest } from '@/src/utils/api';
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    try {
      await ensureContainer();
    } catch (err) {
      return handleRouteError(err, 'storage initialization', 'Failed to initialize storage');
    }
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    if (!audioFile || !sessionId) {
      return handleBadRequest('Missing required fields: audio, sessionId');
    }
    const audioBuffer = await audioFile.arrayBuffer();
    if (!audioBuffer) {
      return handleRouteError(
        new Error('Failed to get array buffer from file'),
        'audio processing',
        'Failed to process audio file'
      );
    }
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type });
    const blobUrl = await uploadAudioBlob(audioBlob, sessionId);
    return NextResponse.json({ url: blobUrl }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'audio upload', 'Failed to upload audio blob');
  }
}