#!/bin/bash
set -e

# Azure configuration
RESOURCE_GROUP="cartoon-annotation-rg"
LOCATION="eastus"
ACR_NAME="cartoonannotationacr"
APP_SERVICE_PLAN="cartoon-annotation-plan"
APP_SERVICE_NAME="cartoon-annotation-app"
IMAGE_NAME="cartoon-annotation"
IMAGE_TAG="latest"

# Create resource group if it doesn't exist
echo "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry if it doesn't exist
echo "Creating Azure Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic

# Log in to ACR
echo "Logging in to ACR..."
az acr login --name $ACR_NAME

# Build and push Docker image to ACR
echo "Building and pushing Docker image to ACR..."
az acr build --registry $ACR_NAME --image $IMAGE_NAME:$IMAGE_TAG .

# Create App Service Plan if it doesn't exist
echo "Creating App Service Plan..."
az appservice plan create --name $APP_SERVICE_PLAN --resource-group $RESOURCE_GROUP --sku B1 --is-linux

# Create Web App if it doesn't exist
echo "Creating Web App..."
az webapp create --resource-group $RESOURCE_GROUP --plan $APP_SERVICE_PLAN --name $APP_SERVICE_NAME \
  --deployment-container-image-name $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG

# Allow system-assigned identity
echo "Configuring system-assigned identity..."
az webapp identity assign --resource-group $RESOURCE_GROUP --name $APP_SERVICE_NAME

# Get the principal ID of the web app's identity
PRINCIPAL_ID=$(az webapp identity show --resource-group $RESOURCE_GROUP --name $APP_SERVICE_NAME --query principalId --output tsv)

# Assign the AcrPull role to the web app's identity for the ACR
echo "Assigning AcrPull role to web app identity..."
ACR_ID=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query id --output tsv)
az role assignment create --assignee $PRINCIPAL_ID --scope $ACR_ID --role AcrPull

# Update the web app to use the ACR image with managed identity
echo "Configuring Web App to use ACR image with managed identity..."
az webapp config container set --resource-group $RESOURCE_GROUP --name $APP_SERVICE_NAME \
  --docker-registry-server-url https://$ACR_NAME.azurecr.io \
  --docker-custom-image-name $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG \
  --docker-registry-server-user "" \
  --docker-registry-server-password ""

# Configure environment variables
echo "Configuring environment variables..."
az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_SERVICE_NAME --settings \
  NODE_ENV=production \
  PORT=3000 \
  WEBSITES_PORT=3000 \
  COSMOS_ENDPOINT=${COSMOS_ENDPOINT} \
  COSMOS_KEY=${COSMOS_KEY} \
  COSMOS_DATABASE_ID=${COSMOS_DATABASE_ID} \
  COSMOS_CONTAINER_ID=${COSMOS_CONTAINER_ID} \
  AZURE_STORAGE_CONNECTION_STRING=${AZURE_STORAGE_CONNECTION_STRING} \
  AZURE_STORAGE_CONTAINER_NAME=${AZURE_STORAGE_CONTAINER_NAME} \
  NEXTAUTH_URL=https://$APP_SERVICE_NAME.azurewebsites.net \
  NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

echo "Deployment completed successfully! Your app is now available at: https://$APP_SERVICE_NAME.azurewebsites.net"