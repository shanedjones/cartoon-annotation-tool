/**
 * Validates that required environment variables are defined.
 * @param keys Optional array of environment variable keys to validate. 
 * If not provided, validates common Cosmos DB environment variables.
 * @returns An object with the validated environment variables
 * @throws Error if any required environment variable is missing
 */
export function validateEnv(keys?: string[]): Record<string, string> {
  // Default to common Cosmos DB environment variables if no keys provided
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

/**
 * Validates and returns Cosmos DB configuration environment variables.
 * This is a shorthand for the most common use case.
 * @returns Object with Cosmos DB configuration
 */
export function getCosmosConfig() {
  const env = validateEnv();
  
  return {
    endpoint: env.COSMOS_ENDPOINT,
    key: env.COSMOS_KEY,
    databaseId: env.COSMOS_DATABASE_ID,
    containerId: env.COSMOS_CONTAINER_ID
  };
}

/**
 * Validates and returns Azure Storage configuration environment variables.
 * @returns Object with Azure Storage configuration
 */
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