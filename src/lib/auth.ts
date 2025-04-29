import { hash, compare } from "bcrypt";
import { getContainer } from "@/src/lib/db";
export async function findUserByEmail(email: string) {
  if (!process.env.COSMOS_USERS_CONTAINER_ID) {
    throw new Error('COSMOS_USERS_CONTAINER_ID environment variable is required');
  }
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
  if (!process.env.COSMOS_USERS_CONTAINER_ID) {
    throw new Error('COSMOS_USERS_CONTAINER_ID environment variable is required');
  }
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
