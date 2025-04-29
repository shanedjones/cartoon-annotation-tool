import { CosmosClient } from '@azure/cosmos';
import { getCosmosConfig } from '@/src/utils/validateEnv';
let cosmosClient: CosmosClient | null = null;
export function getCosmosClient(): CosmosClient {
  if (!cosmosClient) {
    const { endpoint, key } = getCosmosConfig();
    cosmosClient = new CosmosClient({ endpoint, key });
  }
  return cosmosClient;
}
export function getDatabase(databaseId?: string) {
  const client = getCosmosClient();
  const { databaseId: defaultDatabaseId } = getCosmosConfig();
  return client.database(databaseId || defaultDatabaseId);
}
export function getContainer(containerId?: string, databaseId?: string) {
  const database = getDatabase(databaseId);
  const { containerId: defaultContainerId } = getCosmosConfig();
  return database.container(containerId || defaultContainerId);
}