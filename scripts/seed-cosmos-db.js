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

// Define the clubs and strengths
const clubs = ["Driver", "7 Iron", "PW"];
const strengths = ["Head-to-Head", "Neck-to-Neck", "Chest-to-Chest"];

// Function to generate swings for a session
function generateSwings(sessionId, startIndex = 1) {
  const swings = [];
  let swingCounter = startIndex;

  clubs.forEach(club => {
    strengths.forEach(strength => {
      const swingId = `swing-${sessionId}-${swingCounter}`;
      swingCounter++;

      // Create descriptions based on club and strength
      let description = "";
      if (club === "Driver") {
        description = `Focus on stance and alignment during the ${strength} position. Check for proper weight distribution and follow-through.`;
      } else if (club === "7 Iron") {
        description = `Analyze the swing plane and body rotation during the ${strength} position. Ensure proper wrist action.`;
      } else {
        description = `Check the hand position and loft presentation during the ${strength} position. Note the divot pattern.`;
      }

      // Create metrics based on club
      let metrics = {};
      let labelProperties = [];
      let dataLabelingTitle = "";
      let keyMetricsTitle = "";

      if (club === "Driver") {
        dataLabelingTitle = "Driver Analysis";
        keyMetricsTitle = "Driver Metrics";
        labelProperties = [
          { id: "setupAlignment", label: "Setup & Alignment" },
          { id: "takeawayPath", label: "Takeaway Path" },
          { id: "backswingPosition", label: "Backswing Position" },
          { id: "downswingTransition", label: "Downswing Transition" },
          { id: "impactPosition", label: "Impact Position" }
        ];
        metrics = {
          "Club Head Speed": `${Math.floor(Math.random() * 20) + 95} mph`,
          "Smash Factor": (1.35 + Math.random() * 0.15).toFixed(2),
          "Launch Angle": `${(13 + Math.random() * 4).toFixed(1)}°`,
          "Spin Rate": `${Math.floor(Math.random() * 600) + 2200} rpm`,
          "Carry Distance": `${Math.floor(Math.random() * 60) + 240} yards`,
          "Clubface Angle": `${(Math.random() * 2 - 1).toFixed(1)}° ${Math.random() > 0.5 ? 'open' : 'closed'}`,
          "Attack Angle": `${(Math.random() * 3 - 1.5).toFixed(1)}°`
        };
      } else if (club === "7 Iron") {
        dataLabelingTitle = "Iron Technique";
        keyMetricsTitle = "Iron Shot Metrics";
        labelProperties = [
          { id: "ballPosition", label: "Ball Position" },
          { id: "wristHinge", label: "Wrist Hinge" },
          { id: "weightTransfer", label: "Weight Transfer" },
          { id: "followThrough", label: "Follow Through" },
          { id: "divotPattern", label: "Divot Pattern" }
        ];
        metrics = {
          "Club Head Speed": `${Math.floor(Math.random() * 15) + 80} mph`,
          "Smash Factor": (1.3 + Math.random() * 0.1).toFixed(2),
          "Dynamic Loft": `${(30 + Math.random() * 4).toFixed(1)}°`,
          "Shaft Lean": `${(6 + Math.random() * 3).toFixed(1)}°`,
          "Spin Rate": `${Math.floor(Math.random() * 1000) + 6000} rpm`,
          "Carry Distance": `${Math.floor(Math.random() * 30) + 150} yards`,
          "Dispersion": `${(3 + Math.random() * 3).toFixed(1)} yards`
        };
      } else {
        dataLabelingTitle = "Pitch Shot Technique";
        keyMetricsTitle = "Wedge Metrics";
        labelProperties = [
          { id: "handPosition", label: "Hand Position" },
          { id: "wristAction", label: "Wrist Action" },
          { id: "lowPointControl", label: "Low Point Control" },
          { id: "faceControl", label: "Face Control" },
          { id: "loftPresentation", label: "Loft Presentation" }
        ];
        metrics = {
          "Club": "56° wedge",
          "Carry Distance": `${Math.floor(Math.random() * 20) + 85} yards`,
          "Spin Rate": `${Math.floor(Math.random() * 1000) + 7000} rpm`,
          "Launch Angle": `${(28 + Math.random() * 6).toFixed(1)}°`,
          "Landing Angle": `${(50 + Math.random() * 10).toFixed(1)}°`,
          "Apex Height": `${Math.floor(Math.random() * 8) + 15} feet`,
          "Roll Out": `${(1 + Math.random() * 3).toFixed(1)} feet`,
          "Shot Dispersion": `${(2 + Math.random() * 3).toFixed(1)} feet`
        };
      }

      // Create the swing
      swings.push({
        id: swingId,
        title: `${club} - ${strength}`,
        description: description,
        thumbnailUrl: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000)}`,
        videoUrl: "https://cartoonannotationsta.blob.core.windows.net/videos/downTheLine.mp4",
        duration: `0:${Math.floor(Math.random() * 20) + 30}`,
        status: "Not Started",
        dataLabelingTitle: dataLabelingTitle,
        labelProperties: labelProperties,
        keyMetricsTitle: keyMetricsTitle,
        metrics: metrics
      });
    });
  });

  return swings;
}

// Sample assessment session data to seed
const assessmentData = [
  {
    id: "session-001",
    athlete: {
      name: "Michael Johnson",
      handicap: 5.2,
      gender: "Male"
    },
    date: "2024-01-15",
    timeWindow: "10:00 AM - 10:45 AM",
    status: "Not Started",
    location: "Store ID: 10345 Bay ID: 3",
    coach: "David Smith",
    swings: generateSwings("001")
  },
  {
    id: "session-002",
    athlete: {
      name: "Sarah Williams",
      handicap: 12.3,
      gender: "Female"
    },
    date: "2024-02-10",
    timeWindow: "2:30 PM - 3:15 PM",
    status: "Not Started",
    location: "Store ID: 20789 Bay ID: 1",
    coach: "Lisa Chen",
    swings: generateSwings("002")
  },
  {
    id: "session-003",
    athlete: {
      name: "Robert Chen",
      handicap: 18.5,
      gender: "Male"
    },
    date: "2024-03-05",
    timeWindow: "9:15 AM - 10:00 AM",
    status: "Not Started",
    location: "Store ID: 35421 Bay ID: 7",
    coach: "Mark Wilson",
    swings: generateSwings("003")
  },
  {
    id: "session-004",
    athlete: {
      name: "Emma Davis",
      handicap: 20.1,
      gender: "Female"
    },
    date: "2024-01-28",
    timeWindow: "1:00 PM - 1:45 PM",
    status: "Not Started",
    location: "Store ID: 48976 Bay ID: 2",
    coach: "Jennifer Adams",
    swings: generateSwings("004")
  },
  {
    id: "session-005",
    athlete: {
      name: "James Rodriguez",
      handicap: 7.4,
      gender: "Male"
    },
    date: "2024-02-18",
    timeWindow: "3:30 PM - 4:15 PM",
    status: "Not Started",
    location: "Store ID: 52314 Bay ID: 5",
    coach: "Richard Taylor",
    swings: generateSwings("005")
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
    console.log('Inserting sample assessment data...');
    
    // Count the total number of swings across all sessions
    const totalSwings = assessmentData.reduce((total, session) => total + session.swings.length, 0);
    console.log(`Creating ${assessmentData.length} assessment sessions with a total of ${totalSwings} swings...`);
    
    for (const session of assessmentData) {
      const { resource: createdItem } = await container.items.create(session);
      console.log(`Created session: ${createdItem.id} with ${session.swings.length} swings`);
    }

    console.log('Seed data inserted successfully');
  } catch (error) {
    console.error('Error seeding Cosmos DB:', error);
  }
}

main()
  .then(() => console.log('Seeding completed successfully'))
  .catch(error => console.error('Seeding failed:', error));