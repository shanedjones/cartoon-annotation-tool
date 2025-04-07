// Load environment variables
require('dotenv').config({ path: '.env' });

const bcrypt = require('bcrypt');
const { CosmosClient } = require('@azure/cosmos');

// Cosmos DB connection
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});

// Database and container names
const databaseId = 'cartoon-db';
const containerId = 'users';

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