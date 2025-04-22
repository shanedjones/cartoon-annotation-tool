import { CosmosClient, Container } from '@azure/cosmos';

/**
 * Initializes and validates connection to Azure Cosmos DB
 * 
 * @param containerName Optional parameter to specify a different container than the default
 * @param usersContainer Set to true to use the users container instead of the default container
 * @returns A Container instance connected to the specified Cosmos DB container
 * @throws Error if any required environment variables are missing
 */
export function initCosmosConnection(containerName?: string, usersContainer = false): Container {
  // Validate required environment variables
  if (!process.env.COSMOS_ENDPOINT) {
    throw new Error('COSMOS_ENDPOINT environment variable is required');
  }

  if (!process.env.COSMOS_KEY) {
    throw new Error('COSMOS_KEY environment variable is required');
  }

  if (!process.env.COSMOS_DATABASE_ID) {
    throw new Error('COSMOS_DATABASE_ID environment variable is required');
  }

  if (!process.env.COSMOS_CONTAINER_ID) {
    throw new Error('COSMOS_CONTAINER_ID environment variable is required');
  }

  // Cosmos DB connection configuration
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseId = process.env.COSMOS_DATABASE_ID;
  const containerId = containerName || 
    (usersContainer ? process.env.COSMOS_USERS_CONTAINER_ID : process.env.COSMOS_CONTAINER_ID);
  
  // Check for users container if needed
  if (usersContainer && !process.env.COSMOS_USERS_CONTAINER_ID) {
    throw new Error('COSMOS_USERS_CONTAINER_ID environment variable is required');
  }

  // Initialize the Cosmos client
  const client = new CosmosClient({ endpoint, key });
  const database = client.database(databaseId);
  const container = database.container(containerId);

  return container;
}