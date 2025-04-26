import { CosmosClient } from '@azure/cosmos';
import { getCosmosConfig } from '@/src/utils/validateEnv';

let cosmosClient: CosmosClient | null = null;

/**
 * Returns a singleton instance of CosmosClient.
 * Initializes the client on first call and reuses it for subsequent calls.
 */
export function getCosmosClient(): CosmosClient {
  if (!cosmosClient) {
    const { endpoint, key } = getCosmosConfig();
    cosmosClient = new CosmosClient({ endpoint, key });
  }
  
  return cosmosClient;
}

/**
 * Gets the database instance from the singleton CosmosClient.
 * @param databaseId Optional database ID (defaults to the one from environment)
 */
export function getDatabase(databaseId?: string) {
  const client = getCosmosClient();
  const { databaseId: defaultDatabaseId } = getCosmosConfig();
  return client.database(databaseId || defaultDatabaseId);
}

/**
 * Gets a container instance from the singleton CosmosClient.
 * @param containerId Optional container ID (defaults to the one from environment)
 * @param databaseId Optional database ID (defaults to the one from environment)
 */
export function getContainer(containerId?: string, databaseId?: string) {
  const database = getDatabase(databaseId);
  const { containerId: defaultContainerId } = getCosmosConfig();
  return database.container(containerId || defaultContainerId);
}