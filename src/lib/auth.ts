import { hash, compare } from "bcrypt";
import { CosmosClient } from "@azure/cosmos";

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

if (!process.env.COSMOS_USERS_CONTAINER_ID) {
  throw new Error('COSMOS_USERS_CONTAINER_ID environment variable is required');
}

// Connect to your Cosmos DB
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});

const database = client.database(process.env.COSMOS_DATABASE_ID);
const container = database.container(process.env.COSMOS_USERS_CONTAINER_ID);

export async function findUserByEmail(email: string) {
  const querySpec = {
    query: "SELECT * FROM c WHERE c.email = @email",
    parameters: [
      {
        name: "@email",
        value: email
      }
    ]
  };
  
  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources[0] || null;
}

export async function createUser(email: string, name: string, password: string) {
  const hashedPassword = await hash(password, 12);
  
  const newUser = {
    id: Date.now().toString(),
    email,
    name,
    hashedPassword,
    createdAt: new Date().toISOString()
  };
  
  const { resource } = await container.items.create(newUser);
  return resource;
}

export async function validatePassword(password: string, hashedPassword: string) {
  return compare(password, hashedPassword);
}
