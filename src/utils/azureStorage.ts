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
  
  try {
    if (!blobServiceClient) {
      
      
      try {
        // Log the formation of the storage client
        
        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        
        
        
        containerClient = blobServiceClient.getContainerClient(containerName);
        
      } catch (innerError) {
        
        if (innerError instanceof Error && innerError.message.includes('Invalid URL')) {
          console.error(`DEBUG - URL construction error details:`, 
            `Container name: "${containerName}"`,
            `Connection string format: ${connectionString.startsWith('DefaultEndpointsProtocol') ? 'Starts correctly' : 'Invalid start'}`);
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

// Create the container if it doesn't exist
export const ensureContainer = async (): Promise<void> => {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'audio-recordings';
    
    
    
    
    if (connectionString.includes('DefaultEndpointsProtocol')) {
      // Log the parts of the connection string to debug issues
      const parts = connectionString.split(';').reduce((acc, part) => {
        const [key, value] = part.split('=');
        if (key && value) {
          acc[key] = key === 'AccountKey' ? `${value.substring(0, 5)}...` : value;
        }
        return acc;
      }, {} as Record<string, string>);
      
    }
    
    const { containerClient } = initializeStorageClient();
    
    // Log the container URL
    
    
    // Create container without specifying public access level
    await containerClient.createIfNotExists();
    
  } catch (error) {
    
    if (error instanceof Error) {
      
      
    }
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
    
    
    // Get the direct URL for the blob
    const blobUrl = blockBlobClient.url;
    
    if (!blobUrl) {
      throw new Error('Failed to generate URL for uploaded blob');
    }
    
    
    
    // Return the URL for the uploaded blob
    return blobUrl;
  } catch (error) {
    
    throw error;
  }
};

// Download a blob from storage
export const downloadAudioBlob = async (blobUrl: string): Promise<Blob> => {
  try {
    if (!blobUrl || typeof blobUrl !== 'string') {
      throw new Error(`Invalid blob URL: ${blobUrl}`);
    }
    
    
    
    // Extract the blob name from the URL
    try {
      const url = new URL(blobUrl);
      const pathParts = url.pathname.split('/');
      
      // Ensure we have a valid path
      if (pathParts.length < 3) {
        throw new Error(`Invalid URL pathname: ${url.pathname}`);
      }
      
      const blobName = pathParts.slice(2).join('/'); // Skip the first two segments (/container/blob)
      
      
      const { containerClient } = initializeStorageClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Download the blob
      const downloadResponse = await blockBlobClient.download();
      
      
      // Convert the stream to a blob
      const data = await streamToBlob(downloadResponse.readableStreamBody);
      return data;
    } catch (urlError) {
      
      
      // Fallback to direct fetch
      
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