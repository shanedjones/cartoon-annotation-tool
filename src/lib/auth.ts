import { hash, compare } from "bcrypt";
import { getContainer } from "@/src/lib/db";

// Connection and validation will be done inside the functions
// to prevent issues during build time

export async function findUserByEmail(email: string) {
  // Validate required environment variables
  if (!process.env.COSMOS_USERS_CONTAINER_ID) {
    throw new Error('COSMOS_USERS_CONTAINER_ID environment variable is required');
  }

  // Get container from the singleton client
  const container = getContainer(process.env.COSMOS_USERS_CONTAINER_ID);
  
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
  // Validate required environment variables
  if (!process.env.COSMOS_USERS_CONTAINER_ID) {
    throw new Error('COSMOS_USERS_CONTAINER_ID environment variable is required');
  }

  // Get container from the singleton client
  const container = getContainer(process.env.COSMOS_USERS_CONTAINER_ID);
  
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
