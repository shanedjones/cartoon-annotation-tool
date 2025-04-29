const { CosmosClient } = require('@azure/cosmos');
function validateEnv(keys) {
  const envKeysToValidate = keys || [
    'COSMOS_ENDPOINT',
    'COSMOS_KEY',
    'COSMOS_DATABASE_ID',
    'COSMOS_CONTAINER_ID'
  ];
  const validatedEnv = {};
  for (const key of envKeysToValidate) {
    if (!process.env[key]) {
      throw new Error(`${key} environment variable is required`);
    }
    validatedEnv[key] = process.env[key];
  }
  return validatedEnv;
}
function getCosmosConfig() {
  const env = validateEnv();
  return {
    endpoint: env.COSMOS_ENDPOINT,
    key: env.COSMOS_KEY,
    databaseId: env.COSMOS_DATABASE_ID,
    containerId: env.COSMOS_CONTAINER_ID
  };
}
let cosmosClient = null;
function getCosmosClient() {
  if (!cosmosClient) {
    const { endpoint, key } = getCosmosConfig();
    cosmosClient = new CosmosClient({ endpoint, key });
  }
  return cosmosClient;
}
function getDatabase(databaseId) {
  const client = getCosmosClient();
  const { databaseId: defaultDatabaseId } = getCosmosConfig();
  return client.database(databaseId || defaultDatabaseId);
}
function getContainer(containerId, databaseId) {
  const database = getDatabase(databaseId);
  const { containerId: defaultContainerId } = getCosmosConfig();
  return database.container(containerId || defaultContainerId);
}
module.exports = {
  getCosmosClient,
  getDatabase,
  getContainer,
  getCosmosConfig,
  validateEnv
};