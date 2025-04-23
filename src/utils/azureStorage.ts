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
  
  console.log(`DEBUG - initializeStorageClient() - container name: "${containerName}"`);
  
  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured');
  }
  
  try {
    if (!blobServiceClient) {
      console.log('Initializing Azure Storage client with connection string');
      
      try {
        // Log the formation of the storage client
        console.log(`DEBUG - Creating BlobServiceClient from connection string`);
        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        console.log(`DEBUG - BlobServiceClient created successfully`);
        
        console.log(`DEBUG - Creating container client for "${containerName}"`);
        containerClient = blobServiceClient.getContainerClient(containerName);
        console.log(`DEBUG - Container client URL: ${containerClient.url}`);
      } catch (innerError) {
        console.error(`DEBUG - Error during client creation: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`);
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
    console.error('Error initializing storage client:', error);
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
    
    console.log(`DEBUG - Container name: "${containerName}"`);
    console.log(`DEBUG - Connection string format check: ${connectionString.includes('DefaultEndpointsProtocol') ? 'Valid format' : 'Invalid format'}`);
    
    if (connectionString.includes('DefaultEndpointsProtocol')) {
      // Log the parts of the connection string to debug issues
      const parts = connectionString.split(';').reduce((acc, part) => {
        const [key, value] = part.split('=');
        if (key && value) {
          acc[key] = key === 'AccountKey' ? `${value.substring(0, 5)}...` : value;
        }
        return acc;
      }, {} as Record<string, string>);
      console.log(`DEBUG - Connection string parts: ${JSON.stringify(parts)}`);
    }
    
    const { containerClient } = initializeStorageClient();
    
    // Log the container URL
    console.log(`DEBUG - Container URL: ${containerClient.url}`);
    
    // Create container without specifying public access level
    await containerClient.createIfNotExists();
    console.log(`Container "${containerName}" is ready`);
  } catch (error) {
    console.error('Error ensuring container exists:', error);
    if (error instanceof Error) {
      console.error(`DEBUG - Error message: ${error.message}`);
      console.error(`DEBUG - Error stack: ${error.stack}`);
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
    
    console.log(`Starting upload for session: ${sessionId}`);
    const { containerClient } = initializeStorageClient();
    
    // Generate a unique filename
    const blobName = `${sessionId}/${uuidv4()}.webm`;
    console.log(`Generated blob name: ${blobName}`);
    
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Convert Blob to Buffer or ArrayBuffer for uploadData
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    if (!arrayBuffer) {
      throw new Error('Failed to convert blob to array buffer');
    }
    
    console.log(`Uploading blob with size: ${arrayBuffer.byteLength} bytes`);
    
    // Upload the blob
    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: audioBlob.type || 'audio/webm',
      }
    };
    
    await blockBlobClient.uploadData(arrayBuffer, uploadOptions);
    console.log(`Audio blob uploaded: ${blobName}`);
    
    // Get the direct URL for the blob
    const blobUrl = blockBlobClient.url;
    
    if (!blobUrl) {
      throw new Error('Failed to generate URL for uploaded blob');
    }
    
    console.log(`Generated URL for blob: ${blobUrl}`);
    
    // Return the URL for the uploaded blob
    return blobUrl;
  } catch (error) {
    console.error('Error uploading audio blob:', error);
    throw error;
  }
};

// Download a blob from storage
export const downloadAudioBlob = async (blobUrl: string): Promise<Blob> => {
  try {
    if (!blobUrl || typeof blobUrl !== 'string') {
      throw new Error(`Invalid blob URL: ${blobUrl}`);
    }
    
    console.log(`Attempting to download blob from URL: ${blobUrl}`);
    
    // Extract the blob name from the URL
    try {
      const url = new URL(blobUrl);
      const pathParts = url.pathname.split('/');
      
      // Ensure we have a valid path
      if (pathParts.length < 3) {
        throw new Error(`Invalid URL pathname: ${url.pathname}`);
      }
      
      const blobName = pathParts.slice(2).join('/'); // Skip the first two segments (/container/blob)
      console.log(`Extracted blob name: ${blobName}`);
      
      const { containerClient } = initializeStorageClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Download the blob
      const downloadResponse = await blockBlobClient.download();
      console.log(`Blob download response received, converting to blob...`);
      
      // Convert the stream to a blob
      const data = await streamToBlob(downloadResponse.readableStreamBody);
      return data;
    } catch (urlError) {
      console.error('Error parsing URL:', urlError);
      
      // Fallback to direct fetch
      console.log('Attempting direct fetch as fallback...');
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`HTTP error, status: ${response.status}`);
      }
      const blob = await response.blob();
      return blob;
    }
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
  // @ts-expect-error - ReadableStream has different types in browser and Node.js environments
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
      // @ts-expect-error - Reader API might differ between browser and Node environments
      let reading = true;
      while (reading) {
        // @ts-expect-error - TypeScript can't infer the specific reader interface
        const result = await reader.read();
        // @ts-expect-error - Reader result structure has done and value properties
        if (result.done) {
          reading = false;
        } else {
          // @ts-expect-error - Value will be an array buffer or similar
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