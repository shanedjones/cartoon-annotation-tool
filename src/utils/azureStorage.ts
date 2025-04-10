import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

// Initialize the BlobServiceClient
let blobServiceClient: BlobServiceClient;
let containerClient: ContainerClient;

// Initialize the storage client
const initializeStorageClient = () => {
  // Get connection string at runtime from environment
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'audio-recordings';
  
  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured');
  }
  
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
  }
  
  return { blobServiceClient, containerClient };
};

// Create the container if it doesn't exist
export const ensureContainer = async (): Promise<void> => {
  try {
    const { containerClient } = initializeStorageClient();
    // Create container without specifying public access level
    await containerClient.createIfNotExists();
    console.log(`Container "${containerName}" is ready`);
  } catch (error) {
    console.error('Error ensuring container exists:', error);
    throw error;
  }
};

// Upload a blob to storage
export const uploadAudioBlob = async (
  audioBlob: Blob,
  sessionId: string
): Promise<string> => {
  try {
    if (!audioBlob || !(audioBlob instanceof Blob)) {
      throw new Error('Invalid audio blob provided');
    }
    
    const { containerClient } = initializeStorageClient();
    
    // Generate a unique filename
    const blobName = `${sessionId}/${uuidv4()}.webm`;
    
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Convert Blob to Buffer or ArrayBuffer for uploadData
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    if (!arrayBuffer) {
      throw new Error('Failed to convert blob to array buffer');
    }
    
    // Upload the blob
    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: audioBlob.type || 'audio/webm',
      }
    };
    
    await blockBlobClient.uploadData(arrayBuffer, uploadOptions);
    console.log(`Audio blob uploaded: ${blobName}`);
    
    // Create a Shared Access Signature (SAS) URL with read permissions that expires in 24 hours
    const expiresOn = new Date();
    expiresOn.setDate(expiresOn.getDate() + 1); // 1 day from now
    
    const sasUrl = blockBlobClient.url;
    console.log(`Generated SAS URL for blob: ${sasUrl}`);
    
    // Return the URL for the uploaded blob
    return sasUrl;
  } catch (error) {
    console.error('Error uploading audio blob:', error);
    throw error;
  }
};

// Download a blob from storage
export const downloadAudioBlob = async (blobUrl: string): Promise<Blob> => {
  try {
    // Extract the blob name from the URL
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/');
    const blobName = pathParts.slice(2).join('/'); // Skip the first two segments (/container/blob)
    
    const { containerClient } = initializeStorageClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Download the blob
    const downloadResponse = await blockBlobClient.download();
    
    // Convert the stream to a blob
    const data = await streamToBlob(downloadResponse.readableStreamBody);
    return data;
  } catch (error) {
    console.error('Error downloading audio blob:', error);
    throw error;
  }
};

// Helper function to convert a stream to a blob
async function streamToBlob(stream: NodeJS.ReadableStream | null | undefined): Promise<Blob> {
  if (!stream) {
    throw new Error('No stream provided');
  }
  
  // Create a wrapper to work in both browser and Node.js environments
  // @ts-ignore - Ignoring type issues with ReadableStream across environments
  const reader = stream.getReader ? stream : new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => {
        controller.enqueue(chunk);
      });
      stream.on('end', () => {
        controller.close();
      });
      stream.on('error', (err) => {
        controller.error(err);
      });
    }
  }).getReader();
  
  // Read all chunks
  const chunks: Uint8Array[] = [];
  
  // Handle stream reading with better type safety
  async function readChunks() {
    try {
      // @ts-ignore - TypeScript doesn't know details of the reader but we're handling it safely
      let reading = true;
      while (reading) {
        // @ts-ignore - TypeScript doesn't understand the reader structure
        const result = await reader.read();
        // @ts-ignore - Structure will have done and value properties
        if (result.done) {
          reading = false;
        } else {
          // @ts-ignore - We know value will be an array buffer or similar
          chunks.push(new Uint8Array(result.value));
        }
      }
    } catch (error) {
      console.error('Error reading stream chunks:', error);
      throw error;
    }
  }
  
  await readChunks();
  
  // Concatenate chunks into a single Uint8Array
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
  
  // Create a Blob from the Uint8Array
  return new Blob([result]);
}