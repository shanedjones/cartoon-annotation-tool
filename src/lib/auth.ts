import { hash, compare } from "bcrypt";
import { CosmosClient } from "@azure/cosmos";
import { initCosmosConnection } from "../utils/cosmosDb";

// Connection and validation will be done inside the functions
// to prevent issues during build time

export async function findUserByEmail(email: string) {
  // Initialize Cosmos DB connection to users container
  const container = initCosmosConnection(undefined, true);
  
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
  // Initialize Cosmos DB connection to users container
  const container = initCosmosConnection(undefined, true);
  
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
