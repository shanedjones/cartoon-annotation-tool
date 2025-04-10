# Deploying to Azure App Service with Azure Container Registry

This guide explains how to deploy the Annotation Tool application to Azure App Service using Azure Container Registry (ACR).

## Prerequisites

1. **Azure CLI**: Install the [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. **Docker**: Install [Docker](https://docs.docker.com/get-docker/)
3. **Azure Account**: An active Azure subscription
4. **Environment Variables**: Prepare your environment variables for production

## Manual Deployment

### Option 1: Using the Deployment Script

1. Make sure your environment variables are set in your terminal session:

```bash
export COSMOS_ENDPOINT=your_cosmos_endpoint
export COSMOS_KEY=your_cosmos_key
export COSMOS_DATABASE_ID=your_cosmos_database_id
export COSMOS_CONTAINER_ID=your_cosmos_container_id
export AZURE_STORAGE_CONNECTION_STRING=your_storage_connection_string
export AZURE_STORAGE_CONTAINER_NAME=your_storage_container_name
export NEXTAUTH_SECRET=your_nextauth_secret
```

2. Run the deployment script:

```bash
./deploy-to-azure.sh
```

### Option 2: Step by Step Manual Deployment

1. **Login to Azure**:

```bash
az login
```

2. **Create a Resource Group**:

```bash
az group create --name annotation-tool-rg --location eastus
```

3. **Create an Azure Container Registry**:

```bash
az acr create --resource-group annotation-tool-rg --name annotationtoolacr --sku Basic
```

4. **Log in to ACR**:

```bash
az acr login --name annotationtoolacr
```

5. **Build and push your Docker image**:

```bash
az acr build --registry annotationtoolacr --image annotation-tool:latest .
```

6. **Create an App Service Plan**:

```bash
az appservice plan create --name annotation-tool-plan --resource-group annotation-tool-rg --sku B1 --is-linux
```

7. **Create a Web App**:

```bash
az webapp create --resource-group annotation-tool-rg --plan annotation-tool-plan --name annotation-tool-app --deployment-container-image-name annotationtoolacr.azurecr.io/annotation-tool:latest
```

8. **Configure system-assigned identity and ACR pull rights**:

```bash
# Enable managed identity
az webapp identity assign --resource-group annotation-tool-rg --name annotation-tool-app

# Get the principal ID
PRINCIPAL_ID=$(az webapp identity show --resource-group annotation-tool-rg --name annotation-tool-app --query principalId --output tsv)

# Assign ACR pull role
ACR_ID=$(az acr show --name annotationtoolacr --resource-group annotation-tool-rg --query id --output tsv)
az role assignment create --assignee $PRINCIPAL_ID --scope $ACR_ID --role AcrPull

# Configure container settings to use managed identity
az webapp config container set --resource-group annotation-tool-rg --name annotation-tool-app \
  --docker-registry-server-url https://annotationtoolacr.azurecr.io \
  --docker-custom-image-name annotationtoolacr.azurecr.io/annotation-tool:latest \
  --docker-registry-server-user "" \
  --docker-registry-server-password ""
```

9. **Configure environment variables**:

```bash
az webapp config appsettings set --resource-group annotation-tool-rg --name annotation-tool-app --settings \
  NODE_ENV=production \
  PORT=3000 \
  WEBSITES_PORT=3000 \
  COSMOS_ENDPOINT=your_cosmos_endpoint \
  COSMOS_KEY=your_cosmos_key \
  COSMOS_DATABASE_ID=your_cosmos_database_id \
  COSMOS_CONTAINER_ID=your_cosmos_container_id \
  AZURE_STORAGE_CONNECTION_STRING=your_storage_connection_string \
  AZURE_STORAGE_CONTAINER_NAME=your_storage_container_name \
  NEXTAUTH_URL=https://annotation-tool-app.azurewebsites.net \
  NEXTAUTH_SECRET=your_nextauth_secret
```

## CI/CD with GitHub Actions

To set up continuous deployment using GitHub Actions:

1. **Create Azure Service Principal**:

```bash
az ad sp create-for-rbac --name "annotation-tool-cicd" --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/annotation-tool-rg \
  --sdk-auth
```

2. **Add Secrets to GitHub Repository**:

Navigate to your GitHub repository > Settings > Secrets and add the following secrets:

- `AZURE_CREDENTIALS`: The JSON output from the service principal creation
- `ACR_USERNAME`: ACR username (can be found with `az acr credential show --name annotationtoolacr --query username`)
- `ACR_PASSWORD`: ACR password (can be found with `az acr credential show --name annotationtoolacr --query passwords[0].value`)
- `COSMOS_ENDPOINT`: Your Cosmos DB endpoint
- `COSMOS_KEY`: Your Cosmos DB key
- `COSMOS_DATABASE_ID`: Your Cosmos DB database ID
- `COSMOS_CONTAINER_ID`: Your Cosmos DB container ID
- `AZURE_STORAGE_CONNECTION_STRING`: Your Azure Storage connection string
- `AZURE_STORAGE_CONTAINER_NAME`: Your Azure Storage container name
- `NEXTAUTH_SECRET`: Your NextAuth secret

3. **Push to Main Branch**:

The GitHub Actions workflow will automatically trigger when you push to the main branch.

## Troubleshooting

1. **Check Web App Logs**:

```bash
az webapp log tail --resource-group annotation-tool-rg --name annotation-tool-app
```

2. **View Deployment History**:

```bash
az webapp deployment list --resource-group annotation-tool-rg --name annotation-tool-app
```

3. **Restart the Web App**:

```bash
az webapp restart --resource-group annotation-tool-rg --name annotation-tool-app
```