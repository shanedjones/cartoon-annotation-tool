// Load environment variables
require('dotenv').config({ path: '.env' });

const bcrypt = require('bcrypt');
const { getCosmosClient, validateEnv } = require('./db');

// Validate environment variables
const env = validateEnv([
  'COSMOS_DATABASE_ID',
  'COSMOS_USERS_CONTAINER_ID'
]);

// Database and container names
const databaseId = env.COSMOS_DATABASE_ID;
const containerId = env.COSMOS_USERS_CONTAINER_ID;

// Get Cosmos client from singleton
const client = getCosmosClient();

console.log(`Using database: ${databaseId}`);
console.log(`Using container: ${containerId}`);

async function main() {
  try {
    console.log('Starting user database setup...');

    // Get or create database
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    console.log(`Database ${databaseId} ready`);

    // Get or create container
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: {
        paths: ['/id']
      }
    });
    console.log(`Container ${containerId} ready`);

    // Check if admin user already exists
    const querySpec = {
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [
        {
          name: "@email",
          value: "admin@example.com"
        }
      ]
    };

    const { resources: existingUsers } = await container.items.query(querySpec).fetchAll();
    
    if (existingUsers.length > 0) {
      console.log('Admin user already exists.');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('password123', 12);
    const adminUser = {
      id: Date.now().toString(),
      email: 'admin@example.com',
      name: 'Admin User',
      hashedPassword,
      createdAt: new Date().toISOString(),
      isAdmin: true
    };

    await container.items.create(adminUser);
    console.log('Admin user created successfully.');

    console.log('\nLogin credentials for testing:');
    console.log('Email: admin@example.com');
    console.log('Password: password123');
    console.log('\nIMPORTANT: Change these credentials in production!');

  } catch (error) {
    console.error('Error setting up user database:', error);
  }
}

main()
  .then(() => console.log('Database setup complete'))
  .catch(err => console.error('Database setup failed:', err));