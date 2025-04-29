export function validateEnv(keys?: string[]): Record<string, string> {
  const envKeysToValidate = keys || [
    'COSMOS_ENDPOINT',
    'COSMOS_KEY',
    'COSMOS_DATABASE_ID',
    'COSMOS_CONTAINER_ID'
  ];
  const validatedEnv: Record<string, string> = {};
  for (const key of envKeysToValidate) {
    if (!process.env[key]) {
      throw new Error(`${key} environment variable is required`);
    }
    validatedEnv[key] = process.env[key] as string;
  }
  return validatedEnv;
}
export function getCosmosConfig() {
  const env = validateEnv();
  return {
    endpoint: env.COSMOS_ENDPOINT,
    key: env.COSMOS_KEY,
    databaseId: env.COSMOS_DATABASE_ID,
    containerId: env.COSMOS_CONTAINER_ID
  };
}
export function getAzureStorageConfig() {
  const env = validateEnv([
    'AZURE_STORAGE_CONNECTION_STRING',
    'AZURE_STORAGE_CONTAINER_NAME'
  ]);
  return {
    connectionString: env.AZURE_STORAGE_CONNECTION_STRING,
    containerName: env.AZURE_STORAGE_CONTAINER_NAME
  };
}