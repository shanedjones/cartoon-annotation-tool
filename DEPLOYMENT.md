# Deploying the Cartoon Annotation Tool

This guide covers how to deploy the application with the reorganized project structure.

## Prerequisites

Before deploying, make sure:

1. All code has been migrated to the new structure using `npm run reorganize`
2. All import paths have been updated to use absolute paths (from `src/`)
3. No references to the old `app/` directory remain in the codebase

## Local Development

To run the application locally:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Production Build

To create a production build:

```bash
# Create optimized production build
npm run build

# Start production server
npm run start
```

## Docker Deployment

The included Dockerfile has been updated to work with the new code organization.

```bash
# Build the Docker image
docker build -t cartoon-annotation-tool .

# Run the container
docker run -p 3000:3000 cartoon-annotation-tool
```

## Environmental Variables

Make sure all required environment variables are properly set as referenced in `next.config.ts`:

- `COSMOS_ENDPOINT`
- `COSMOS_KEY`
- `COSMOS_DATABASE_ID`
- `COSMOS_CONTAINER_ID`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER_NAME`

These can be set in your environment, in a `.env` file for local development, or in your deployment platform's configuration.

## Azure Deployment

For details on Azure deployment, refer to the `AZURE_DEPLOYMENT.md` file.