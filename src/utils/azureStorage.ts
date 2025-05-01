import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { getAzureStorageConfig } from './validateEnv';
let blobServiceClient: BlobServiceClient;
let containerClient: ContainerClient;
const initializeStorageClient = () => {
  const { connectionString, containerName } = getAzureStorageConfig();
  try {
    if (!blobServiceClient) {
      try {
        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        containerClient = blobServiceClient.getContainerClient(containerName);
      } catch (innerError) {
        if (innerError instanceof Error && innerError.message.includes('Invalid URL')) {
          console.error('Invalid URL error in Azure Storage client initialization');
        }
        throw innerError;
      }
    }
    return { blobServiceClient, containerClient };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to initialize Azure Storage: ${error.message}`);
    } else {
      throw new Error('Failed to initialize Azure Storage with unknown error');
    }
  }
};
export const ensureContainer = async (): Promise<void> => {
  try {
    const { connectionString } = getAzureStorageConfig();
    if (connectionString.includes('DefaultEndpointsProtocol')) {
      const parts = connectionString.split(';').reduce((acc, part) => {
        const [key, value] = part.split('=');
        if (key && value) {
          acc[key] = key === 'AccountKey' ? `${value.substring(0, 5)}...` : value;
        }
        return acc;
      }, {} as Record<string, string>);
    }
    const { containerClient } = initializeStorageClient();
    await containerClient.createIfNotExists();
  } catch (error) {
    if (error instanceof Error) {
    }
    throw error;
  }
};
export const uploadAudioBlob = async (
  audioBlob: Blob,
  sessionId: string
): Promise<string> => {
  try {
    if (!audioBlob || !(audioBlob instanceof Blob)) {
      throw new Error('Invalid audio blob provided');
    }
    const { containerClient } = initializeStorageClient();
    const blobName = `${sessionId}/${uuidv4()}.webm`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const arrayBuffer = await audioBlob.arrayBuffer();
    if (!arrayBuffer) {
      throw new Error('Failed to convert blob to array buffer');
    }
    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: audioBlob.type || 'audio/webm',
      }
    };
    await blockBlobClient.uploadData(arrayBuffer, uploadOptions);
    const blobUrl = blockBlobClient.url;
    if (!blobUrl) {
      throw new Error('Failed to generate URL for uploaded blob');
    }
    return blobUrl;
  } catch (error) {
    throw error;
  }
};
export const downloadAudioBlob = async (blobUrl: string): Promise<Blob> => {
  try {
    if (!blobUrl || typeof blobUrl !== 'string') {
      throw new Error(`Invalid blob URL: ${blobUrl}`);
    }
    try {
      const url = new URL(blobUrl);
      const pathParts = url.pathname.split('/');
      if (pathParts.length < 3) {
        throw new Error(`Invalid URL pathname: ${url.pathname}`);
      }
      const blobName = pathParts.slice(2).join('/');
      const { containerClient } = initializeStorageClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const downloadResponse = await blockBlobClient.download();
      const data = await streamToBlob(downloadResponse.readableStreamBody);
      return data;
    } catch (urlError) {
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`HTTP error, status: ${response.status}`);
      }
      const blob = await response.blob();
      return blob;
    }
  } catch (error) {
    throw error;
  }
};
async function streamToBlob(stream: ReadableStream | NodeJS.ReadableStream | null | undefined): Promise<Blob> {
  if (!stream) {
    throw new Error('No stream provided');
  }
  
  // Check if the stream is a web ReadableStream (has getReader method)
  const isWebStream = 'getReader' in stream;
  
  const reader = isWebStream 
    ? (stream as ReadableStream).getReader()
    : new ReadableStream({
        start(controller) {
          (stream as NodeJS.ReadableStream).on('data', (chunk) => {
            controller.enqueue(chunk);
          });
          (stream as NodeJS.ReadableStream).on('end', () => {
            controller.close();
          });
          (stream as NodeJS.ReadableStream).on('error', (err) => {
            controller.error(err);
          });
        }
      }).getReader();
  const chunks: Uint8Array[] = [];
  async function readChunks() {
    try {
      let reading = true;
      while (reading) {
        const result = await reader.read();
        if (result.done) {
          reading = false;
        } else {
          chunks.push(new Uint8Array(result.value));
        }
      }
    } catch (error) {
      throw error;
    }
  }
  await readChunks();
  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new Blob([result]);
}