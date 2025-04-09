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
    title: "Michael Johnson - Driver Full Swing",
    description: "Please review the stance throughout the swing and check if the club path is correct on the downswing.",
    thumbnailUrl: "https://img.freepik.com/free-photo/full-shot-man-playing-golf_23-2149354970.jpg",
    videoUrl: "https://cartoonannotationsta.blob.core.windows.net/videos/downTheLine.mp4",
    duration: "0:38",
    dateAdded: "2024-01-15",
    status: "Not Started",
    tags: [
      "DR",
      "HCP 5"
    ],
    dataLabelingTitle: "Swing Analysis",
    labelProperties: [
      { id: "setupAlignment", label: "Setup & Alignment" },
      { id: "takeawayPath", label: "Takeaway Path" },
      { id: "backswingPosition", label: "Backswing Position" },
      { id: "downswingTransition", label: "Downswing Transition" },
      { id: "impactPosition", label: "Impact Position" }
    ],
    keyMetricsTitle: "Driver Metrics",
    metrics: {
      "Club Head Speed": "112 mph",
      "Smash Factor": 1.48,
      "Launch Angle": "13.5°",
      "Spin Rate": "2340 rpm",
      "Carry Distance": "285 yards",
      "Clubface Angle": "0.2° open",
      "Attack Angle": "-1.2°",
      "Handicap": "+2.5"
    }
  },
  {
    id: "video-002",
    title: "Sarah Williams - 7 Iron Full Strength",
    description: "Can you review if the weight transfer is correct? Pay attention to the transition at the top of the backswing.",
    thumbnailUrl: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration: "0:45",
    dateAdded: "2024-02-10",
    status: "Not Started",
    tags: [
      "7I",
      "HCP 12"
    ],
    dataLabelingTitle: "Iron Technique",
    labelProperties: [
      { id: "ballPosition", label: "Ball Position" },
      { id: "wristHinge", label: "Wrist Hinge" },
      { id: "weightTransfer", label: "Weight Transfer" },
      { id: "followThrough", label: "Follow Through" },
      { id: "divotPattern", label: "Divot Pattern" }
    ],
    keyMetricsTitle: "Iron Shot Metrics",
    metrics: {
      "Club Head Speed": "87 mph",
      "Smash Factor": 1.38,
      "Dynamic Loft": "32.5°",
      "Shaft Lean": "7.2°",
      "Spin Rate": "6540 rpm",
      "Carry Distance": "165 yards",
      "Dispersion": "4.5 yards",
      "Handicap": "5"
    }
  },
  {
    id: "video-003",
    title: "Robert Chen - SW Bunker Shot",
    description: "Check if sand entry point is correct and provide feedback on the follow-through technique.",
    thumbnailUrl: "https://images.unsplash.com/photo-1592919505780-303950717480",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    duration: "0:52",
    dateAdded: "2024-03-05",
    status: "Not Started",
    tags: [
      "SW",
      "HCP 18"
    ],
    dataLabelingTitle: "Sand Technique",
    labelProperties: [
      { id: "stanceWidth", label: "Stance Width" },
      { id: "clubFacePosition", label: "Clubface Position" },
      { id: "sandEntry", label: "Sand Entry" },
      { id: "followThroughLength", label: "Follow Through Length" },
      { id: "bodyRotation", label: "Body Rotation" }
    ],
    keyMetricsTitle: "Bunker Shot Metrics",
    metrics: {
      "Club": "58° wedge",
      "Sand Type": "Fluffy",
      "Entry Point": "1.5 inches behind ball",
      "Swing Speed": "67 mph",
      "Shot Height": "High",
      "Spin Rate": "8650 rpm",
      "Carry Distance": "24 yards",
      "Roll Out": "4 feet"
    }
  },
  {
    id: "video-004",
    title: "Emma Davis - Putter 8-foot Break",
    description: "Please review the stroke path and face alignment at impact. Is the tempo consistent through the stroke?",
    thumbnailUrl: "https://images.unsplash.com/photo-1611374243147-44a702c2e414",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    duration: "0:41",
    dateAdded: "2024-01-28",
    status: "Not Started",
    tags: [
      "PT",
      "HCP 20"
    ],
    dataLabelingTitle: "Putting Elements",
    labelProperties: [
      { id: "gripPressure", label: "Grip Pressure" },
      { id: "strokePath", label: "Stroke Path" },
      { id: "faceAngle", label: "Face Angle" },
      { id: "tempo", label: "Tempo" },
      { id: "acceleration", label: "Acceleration" }
    ],
    keyMetricsTitle: "Putting Metrics",
    metrics: {
      "Stroke Type": "Slight Arc",
      "Tempo Ratio": "2:1 (back:through)",
      "Face Rotation": "0.3°",
      "Path Deviation": "0.2° inside",
      "Impact Position": "Center",
      "Ball Speed": "6.8 feet/second",
      "Distance Control": "97% accuracy",
      "Make Percentage": "88% from 10 feet"
    }
  },
  {
    id: "video-005",
    title: "James Rodriguez - PW Half Strength",
    description: "Can you check if hand position at impact is correct? Also review if loft presentation is appropriate for a half swing.",
    thumbnailUrl: "https://images.unsplash.com/photo-1576690234871-28f376265de8",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    duration: "0:37",
    dateAdded: "2024-02-18",
    status: "Not Started",
    tags: [
      "PW",
      "HCP 7"
    ],
    dataLabelingTitle: "Pitch Shot Technique",
    labelProperties: [
      { id: "handPosition", label: "Hand Position" },
      { id: "wristAction", label: "Wrist Action" },
      { id: "lowPointControl", label: "Low Point Control" },
      { id: "faceControl", label: "Face Control" },
      { id: "loftPresentation", label: "Loft Presentation" }
    ],
    keyMetricsTitle: "Pitch Shot Metrics",
    metrics: {
      "Club": "56° wedge",
      "Carry Distance": "38 yards",
      "Spin Rate": "7340 rpm",
      "Launch Angle": "32°",
      "Landing Angle": "55°",
      "Apex Height": "18 feet",
      "Roll Out": "2.5 feet",
      "Shot Dispersion": "3.8 feet"
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