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
    location: "Oak Ridge Golf Club",
    coach: "David Smith",
    swings: [
      {
        id: "swing-001-1",
        title: "Driver Full Swing",
        description: "Please review the stance throughout the swing and check if the club path is correct on the downswing.",
        thumbnailUrl: "https://img.freepik.com/free-photo/full-shot-man-playing-golf_23-2149354970.jpg",
        videoUrl: "https://cartoonannotationsta.blob.core.windows.net/videos/downTheLine.mp4",
        duration: "0:38",
        status: "Not Started",
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
          "Attack Angle": "-1.2°"
        }
      },
      {
        id: "swing-001-2",
        title: "7 Iron Full Strength",
        description: "Can you review if the weight transfer is correct? Pay attention to the transition at the top of the backswing.",
        thumbnailUrl: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b",
        videoUrl: "https://cartoonannotationsta.blob.core.windows.net/videos/downTheLine.mp4",
        duration: "0:45",
        status: "Not Started",
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
          "Dispersion": "4.5 yards"
        }
      }
    ]
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
    location: "Pine Valley Golf Resort",
    coach: "Lisa Chen",
    swings: [
      {
        id: "swing-002-1",
        title: "Driver Full Swing",
        description: "Focus on hip rotation and weight transfer. Note if the backswing is overextended.",
        thumbnailUrl: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b",
        videoUrl: "https://cartoonannotationsta.blob.core.windows.net/videos/downTheLine.mp4",
        duration: "0:41",
        status: "Not Started",
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
          "Club Head Speed": "94 mph",
          "Smash Factor": 1.42,
          "Launch Angle": "14.2°",
          "Spin Rate": "2580 rpm",
          "Carry Distance": "225 yards",
          "Clubface Angle": "1.5° open",
          "Attack Angle": "0.8°"
        }
      },
      {
        id: "swing-002-2",
        title: "SW Bunker Shot",
        description: "Check if sand entry point is correct and provide feedback on the follow-through technique.",
        thumbnailUrl: "https://images.unsplash.com/photo-1592919505780-303950717480",
        videoUrl: "https://cartoonannotationsta.blob.core.windows.net/videos/downTheLine.mp4",
        duration: "0:52",
        status: "Not Started",
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
      }
    ]
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
    location: "Meadowbrook Golf Academy",
    coach: "Mark Wilson",
    swings: [
      {
        id: "swing-003-1",
        title: "PW Half Strength",
        description: "Can you check if hand position at impact is correct? Also review if loft presentation is appropriate for a half swing.",
        thumbnailUrl: "https://images.unsplash.com/photo-1576690234871-28f376265de8",
        videoUrl: "https://cartoonannotationsta.blob.core.windows.net/videos/downTheLine.mp4",
        duration: "0:37",
        status: "Not Started",
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
    ]
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
    location: "Westview Golf Course",
    coach: "Jennifer Adams",
    swings: [
      {
        id: "swing-004-1",
        title: "Driver Full Swing",
        description: "Analyze the swing plane and body rotation. Focus on maintaining posture through impact.",
        thumbnailUrl: "https://images.unsplash.com/photo-1611374243147-44a702c2e414",
        videoUrl: "https://cartoonannotationsta.blob.core.windows.net/videos/downTheLine.mp4",
        duration: "0:41",
        status: "Not Started",
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
          "Club Head Speed": "85 mph",
          "Smash Factor": 1.35,
          "Launch Angle": "15.1°",
          "Spin Rate": "3100 rpm",
          "Carry Distance": "180 yards",
          "Clubface Angle": "2.3° closed",
          "Attack Angle": "2.1°"
        }
      },
      {
        id: "swing-004-2",
        title: "Putter 8-foot Break",
        description: "Please review the stroke path and face alignment at impact. Is the tempo consistent through the stroke?",
        thumbnailUrl: "https://images.unsplash.com/photo-1611374243147-44a702c2e414",
        videoUrl: "https://cartoonannotationsta.blob.core.windows.net/videos/downTheLine.mp4",
        duration: "0:41",
        status: "Not Started",
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
      }
    ]
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
    location: "Highland Links Golf Club",
    coach: "Richard Taylor",
    swings: [
      {
        id: "swing-005-1",
        title: "Driver Full Swing",
        description: "Review shoulder rotation and spine angle. Check if club path is on plane.",
        thumbnailUrl: "https://images.unsplash.com/photo-1576690234871-28f376265de8",
        videoUrl: "https://cartoonannotationsta.blob.core.windows.net/videos/downTheLine.mp4",
        duration: "0:37",
        status: "Not Started",
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
          "Club Head Speed": "108 mph",
          "Smash Factor": 1.46,
          "Launch Angle": "13.9°",
          "Spin Rate": "2420 rpm",
          "Carry Distance": "272 yards",
          "Clubface Angle": "0.5° closed",
          "Attack Angle": "-0.8°"
        }
      }
    ]
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
    for (const session of assessmentData) {
      const { resource: createdItem } = await container.items.create(session);
      console.log(`Created session: ${createdItem.id}`);
    }

    console.log('Seed data inserted successfully');
  } catch (error) {
    console.error('Error seeding Cosmos DB:', error);
  }
}

main()
  .then(() => console.log('Seeding completed successfully'))
  .catch(error => console.error('Seeding failed:', error));