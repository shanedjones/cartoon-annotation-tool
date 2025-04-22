import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    COSMOS_ENDPOINT: process.env.COSMOS_ENDPOINT,
    COSMOS_KEY: process.env.COSMOS_KEY,
    COSMOS_DATABASE_ID: process.env.COSMOS_DATABASE_ID,
    COSMOS_CONTAINER_ID: process.env.COSMOS_CONTAINER_ID,
    AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
    AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME,
  },
  output: 'standalone',
  
  // Support for absolute imports
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'src': path.resolve(__dirname, 'src'),
    };
    return config;
  },
};

export default nextConfig;
