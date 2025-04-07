// Seed script for Cosmos DB
// Usage: node scripts/seed-cosmos-db.js

require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

// Cosmos DB connection configuration
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE_ID || '';
const containerId = process.env.COSMOS_CONTAINER_ID || '';

// Check for required environment variables
if (!endpoint || !key) {
  console.error('Error: COSMOS_ENDPOINT and COSMOS_KEY environment variables are required.');
  console.error('Please create a .env file with these values or set them in your environment.');
  process.exit(1);
}

// Initialize the Cosmos client
const client = new CosmosClient({ endpoint, key });

// Sample video data to seed
const videoData = [
  {
    id: "video-001",
    title: "Big Buck Bunny",
    description: "A short animated film featuring a big rabbit dealing with three bullying rodents",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    duration: "10:34",
    dateAdded: "2023-12-15",
    status: "Not Started",
    categories: [
      "3D Animation",
      "Short Film",
      "Comedy"
    ],
    dataLabelingTitle: "Animation Categories",
    labelProperties: [
      { id: "artisticStyle", label: "Artistic Style" },
      { id: "characterDesign", label: "Character Design" },
      { id: "motionDynamics", label: "Motion Dynamics" },
      { id: "colorPalette", label: "Color Palette" },
      { id: "narrativeTechniques", label: "Narrative Techniques" }
    ],
    metrics: {
      "Runtime": "10:34",
      "Release Year": 2008,
      "Production Budget": "$150,000",
      "Character Count": 4,
      "Animation Team Size": 12,
      "Frames Rendered": "15,240",
      "Software Used": "Blender"
    }
  },
  {
    id: "video-002",
    title: "Sintel",
    description: "A girl seeking revenge for the death of her pet dragon encounters several dangerous adventures",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Sintel_poster.jpg/800px-Sintel_poster.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    duration: "14:48",
    dateAdded: "2024-01-05",
    status: "Completed",
    categories: [
      "3D Animation",
      "Fantasy",
      "Adventure"
    ],
    dataLabelingTitle: "Fantasy Elements",
    labelProperties: [
      { id: "worldBuilding", label: "World Building" },
      { id: "characterArcs", label: "Character Arcs" },
      { id: "visualEffects", label: "Visual Effects" },
      { id: "storyStructure", label: "Story Structure" },
      { id: "emotionalImpact", label: "Emotional Impact" }
    ],
    metrics: {
      "Runtime": "14:48",
      "Release Year": 2010,
      "Production Budget": "$400,000",
      "Character Count": 12,
      "Animation Team Size": 14,
      "Frames Rendered": "22,500",
      "Software Used": "Blender"
    }
  },
  {
    id: "video-003",
    title: "Tears of Steel",
    description: "A sci-fi film about a group of warriors and scientists who try to save the world from robots",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    duration: "12:14",
    dateAdded: "2024-01-12",
    status: "Not Started",
    categories: [
      "Sci-Fi",
      "Short Film",
      "VFX"
    ],
    dataLabelingTitle: "Sci-Fi Elements",
    labelProperties: [
      { id: "conceptDevelopment", label: "Concept Development" },
      { id: "vfxIntegration", label: "VFX Integration" },
      { id: "futuristicDesign", label: "Futuristic Design" },
      { id: "technicalExecution", label: "Technical Execution" },
      { id: "thematicCohesion", label: "Thematic Cohesion" }
    ],
    metrics: {
      "Runtime": "12:14", 
      "Release Year": 2012,
      "Production Budget": "$630,000",
      "Character Count": 8,
      "Animation Team Size": 18,
      "VFX Shots": 65,
      "Software Used": "Blender, GIMP"
    }
  },
  {
    id: "video-004",
    title: "Elephant's Dream",
    description: "The first open movie project from the Blender Foundation about two strange characters exploring a mechanized world",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d2/Elephants_Dream_poster.jpg",
    videoUrl: "https://archive.org/download/ElephantsDream/ed_hd.mp4",
    duration: "10:54",
    dateAdded: "2023-11-15",
    status: "Archived",
    categories: [
      "3D Animation",
      "Abstract",
      "Experimental"
    ],
    dataLabelingTitle: "Experimental Animation",
    labelProperties: [
      { id: "abstractConcepts", label: "Abstract Concepts" },
      { id: "experimentalTechnique", label: "Experimental Technique" },
      { id: "symbolism", label: "Symbolism" },
      { id: "soundDesign", label: "Sound Design" },
      { id: "artisticVision", label: "Artistic Vision" }
    ],
    metrics: {
      "Runtime": "10:54",
      "Release Year": 2006,
      "Production Budget": "$120,000",
      "Character Count": 2,
      "Animation Team Size": 7,
      "Frames Rendered": "14,350",
      "Software Used": "Blender"
    }
  },
  {
    id: "video-005",
    title: "Caminandes: Llama Drama",
    description: "A llama tries to cross a fence to reach greener pastures while avoiding a grumpy guard dog",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Caminandes_-_Llama_Drama_Poster.jpg/800px-Caminandes_-_Llama_Drama_Poster.jpg",
    videoUrl: "https://archive.org/download/Caminandes-LlamaDrama/caminandes_llamadrama_1080p.mp4",
    duration: "2:30",
    dateAdded: "2023-12-28",
    status: "Completed",
    categories: [
      "3D Animation",
      "Comedy",
      "Short Film"
    ],
    dataLabelingTitle: "Character Animation",
    labelProperties: [
      { id: "characterExpression", label: "Character Expression" },
      { id: "comicTiming", label: "Comic Timing" },
      { id: "environmentDesign", label: "Environment Design" },
      { id: "animalPhysics", label: "Animal Physics" },
      { id: "visualStorytelling", label: "Visual Storytelling" }
    ],
    metrics: {
      "Runtime": "2:30",
      "Release Year": 2013,
      "Production Budget": "$85,000",
      "Character Count": 2,
      "Animation Team Size": 5,
      "Frames Rendered": "3,600",
      "Software Used": "Blender"
    }
  }
];

async function main() {
  try {
    // Create database if it doesn't exist
    console.log(`Checking for database: ${databaseId}...`);
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    console.log(`Database: ${database.id} ${database.id === databaseId ? 'exists' : 'created'}`);

    // Create container if it doesn't exist
    console.log(`Checking for container: ${containerId}...`);
    const { container } = await database.containers.createIfNotExists({ 
      id: containerId,
      partitionKey: { paths: ["/id"] } 
    });
    console.log(`Container: ${container.id} ${container.id === containerId ? 'exists' : 'created'}`);

    // Check if the container is already populated
    const { resources: existingItems } = await container.items.query({
      query: "SELECT VALUE COUNT(1) FROM c"
    }).fetchAll();

    const itemCount = existingItems[0];
    if (itemCount > 0) {
      console.log(`Container already contains ${itemCount} items. Do you want to clear and reseed? (yes/no)`);
      // In a real script, you would add user input here
      // For this example, we'll assume "yes" and continue
      console.log('Proceeding with clear and reseed...');
      
      // Delete existing items
      console.log('Deleting existing items...');
      const { resources: allItems } = await container.items.query({
        query: "SELECT c.id FROM c"
      }).fetchAll();
      
      for (const item of allItems) {
        await container.item(item.id, item.id).delete();
        console.log(`Deleted item: ${item.id}`);
      }
    }

    // Insert sample data
    console.log('Inserting sample video data...');
    for (const video of videoData) {
      const { resource: createdItem } = await container.items.create(video);
      console.log(`Created item: ${createdItem.id}`);
    }

    console.log('Seed data inserted successfully');
  } catch (error) {
    console.error('Error seeding Cosmos DB:', error);
  }
}

main()
  .then(() => console.log('Seeding completed successfully'))
  .catch(error => console.error('Seeding failed:', error));