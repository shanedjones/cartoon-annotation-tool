import { hash, compare } from "bcrypt";
import { CosmosClient } from "@azure/cosmos";

// Connect to your Cosmos DB
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT || "",
  key: process.env.COSMOS_KEY || "",
});

const database = client.database("cartoon-db");
const container = database.container("users");

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
