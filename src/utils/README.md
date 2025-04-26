# Utility Functions

## Environment Variable Validation

The `validateEnv.ts` utility provides a centralized way to validate environment variables across the application:

### Functions

#### `validateEnv(keys?: string[]): Record<string, string>`

Validates that specified environment variables are defined:
- Takes an optional array of environment variable keys to validate
- If keys are not provided, it defaults to validating common Cosmos DB environment variables
- Returns an object with the validated environment variables
- Throws an error if any required environment variable is missing

Example:
```typescript
import { validateEnv } from '@/utils/validateEnv';

// Validate specific environment variables
const env = validateEnv(['API_KEY', 'API_SECRET']);
const apiKey = env.API_KEY;
```

#### `getCosmosConfig()`

Convenience function to validate and return Cosmos DB configuration:
- Returns an object with Cosmos DB configuration properties:
  - `endpoint`: The Cosmos DB endpoint
  - `key`: The Cosmos DB access key
  - `databaseId`: The Cosmos DB database ID
  - `containerId`: The Cosmos DB container ID

Example:
```typescript
import { getCosmosConfig } from '@/utils/validateEnv';

// In an API route
export async function GET(request: Request) {
  try {
    const { endpoint, key, databaseId, containerId } = getCosmosConfig();
    // Use the configuration...
  } catch (error) {
    // Handle missing environment variables
  }
}
```

#### `getAzureStorageConfig()`

Convenience function to validate and return Azure Storage configuration:
- Returns an object with Azure Storage configuration properties:
  - `connectionString`: The Azure Storage connection string
  - `containerName`: The Azure Storage container name

Example:
```typescript
import { getAzureStorageConfig } from '@/utils/validateEnv';

// In a storage utility function
export const uploadFile = async (file: File) => {
  const { connectionString, containerName } = getAzureStorageConfig();
  // Upload the file...
}
```