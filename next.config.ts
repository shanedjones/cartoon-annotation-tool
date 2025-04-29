import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  env: {
    COSMOS_ENDPOINT: process.env.COSMOS_ENDPOINT,
    COSMOS_KEY: process.env.COSMOS_KEY,
    COSMOS_DATABASE_ID: process.env.COSMOS_DATABASE_ID,
    COSMOS_CONTAINER_ID: process.env.COSMOS_CONTAINER_ID,
    AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
    AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME,
  },
  output: 'standalone',
};
export default nextConfig;
