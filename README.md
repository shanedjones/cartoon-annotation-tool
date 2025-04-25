# Session Annotation Tool

A Next.js application for recording, annotating, and replaying video sessions with synchronized audio, video, drawing capabilities, and annotation category tagging.

## Overview

This tool allows users to:
- Browse videos in an inbox with filtering and search capabilities
- Record synchronized audio while watching and interacting with videos
- Add visual annotations and drawings directly on the video
- Tag annotations with specific categories (e.g., Artistic Style, Character Design)
- Capture all video player interactions (play, pause, seek, etc.)
- Replay entire sessions with perfect audio-video-annotation synchronization
- View selected annotation categories during replay
- Save and load feedback sessions as JSON files
- Store video data in Azure Cosmos DB

## Installation & Setup

1. **Clone the repository**
   ```
   git clone https://github.com/shanedjones/cartoon-annotation-tool
   cd cartoon-annotation-tool
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Set up Azure Cosmos DB**
   - Create an Azure Cosmos DB account with SQL API
   - Create a database named `annotation-db`
   - Create a container named `annotations` with `/id` as the partition key
   - Copy your Cosmos DB endpoint and key from the Azure portal

4. **Set up Azure Blob Storage**
   - Create an Azure Storage account
   - Create a blob container named `audio-recordings`
   - Copy your storage connection string from the Azure portal

5. **Configure environment variables**
   - Create a `.env` file in the root directory:
   ```
   # Azure Cosmos DB Configuration
   COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
   COSMOS_KEY=your-primary-key
   COSMOS_DATABASE_ID=annotation-db
   COSMOS_CONTAINER_ID=annotations
   
   # Azure Storage Configuration
   AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=your-account;AccountKey=your-key;EndpointSuffix=core.windows.net
   AZURE_STORAGE_CONTAINER_NAME=audio-recordings
   
   # Note: For Azure Storage, ensure that the storage account allows blob operations. 
   # Public access at container level is not required as the app will handle authentication.
   ```

5. **Seed the database and users**
   ```
   npm run seed-db
   npm run seed-users
   ```

6. **Run the development server**
   ```
   npm run dev
   ```

7. **Build for production**
   ```
   npm run build
   npm start
   ```

## Key Components

### FeedbackOrchestrator
- Core orchestration component that coordinates all events
- Manages recording and replay synchronization
- Uses an audio-based timeline as the primary synchronization mechanism
- Handles all events based on relative time offsets (video, annotations, categories)
- Processes category events and provides them during replay
- Doesn't render any UI itself (headless component)

### VideoPlayerWrapper
- Container component that integrates the orchestrator with UI components
- Manages UI state for recording/replaying
- Handles file saving and loading, including category data
- Provides reset behavior for recording and replay
- Provides global access for category change recording
- Serves as the main entry point for the application

### Annotation Categories
- Allows tagging of annotations with predefined categories
- Categories can be selected/deselected during recording
- Categories are stored as both timeline events and session metadata
- During replay, all selected categories are shown in a list view

### VideoPlayer
- Customized video player with annotation capabilities
- Provides controls for play, pause, seek, volume, etc.
- Exposes imperative methods for controlling playback
- Forwards references to the annotation canvas

### AnnotationCanvas
- Canvas-based drawing component overlaid on the video
- Supports real-time drawing with color and width controls
- Handles both user-created and replayed annotations
- Carefully synchronizes with video timeline

### AudioRecorder
- Handles audio recording and playback
- Manages browser compatibility issues
- Provides error handling for permissions issues
- Serializes audio data for storage and replay

## Data Model

The application uses two main data structures:

1. **FeedbackSession**: Modern format used internally
   ```typescript
   interface FeedbackSession {
     id: string;
     videoId: string;
     startTime: number;
     endTime?: number;
     audioTrack: AudioTrack;
     events: TimelineEvent[];
     categories?: Record<string, number | null>; // Added to store category ratings (1-5 stars or null)
   }
   
   // Audio track containing all audio recording data
   interface AudioTrack {
     chunks: AudioChunk[];
     totalDuration: number;
   }
   
   // Timeline event - all synchronized to audio timeline
   interface TimelineEvent {
     id: string;
     type: 'video' | 'annotation' | 'marker' | 'category';
     timeOffset: number; // milliseconds from audio start
     duration?: number; // for events with duration
     payload: any; // specific data based on type
   }
   ```

2. **FeedbackData**: Legacy format maintained for backward compatibility
   ```typescript
   interface FeedbackData {
     sessionId: string;
     videoId: string;
     actions: RecordedAction[];
     startTime: number;
     endTime?: number;
     annotations?: DrawingPath[];
     audioChunks?: AudioChunk[];
   }
   ```

3. **Audio Data Structure**: Audio data is stored with metadata for playback
   ```typescript
   interface AudioChunk {
     blob: Blob | string;      // The audio data as Blob or string (for serialization)
     startTime: number;        // Relative to recording start
     duration: number;         // Length of audio chunk in ms
     videoTime: number;        // Video timestamp when this audio was recorded
     url?: string;             // URL for playback (created during replay)
     mimeType?: string;        // MIME type for proper playback
     blobUrl?: string;         // URL for the Azure Storage blob
   }
   ```

4. **Event Payloads**: Different event types have specific payload structures:
   ```typescript
   // Video event payload
   interface VideoEventPayload {
     action: 'play' | 'pause' | 'seek' | 'volume' | 'playbackRate';
     to?: number; // For seek, volume, and playbackRate events
   }
   
   // Annotation event payload
   interface AnnotationEventPayload {
     action: 'draw' | 'clear';
     path?: DrawingPath; // For draw events
   }
   
   // Category event payload
   interface CategoryEventPayload {
     category: string; // The category name (e.g., "artisticStyle")
     rating: number; // The star rating (1-5) or 0 to clear
   }
   
   // Marker event payload
   interface MarkerEventPayload {
     text: string; // The marker text
   }
   ```

## Key Features

### Recording Sessions
1. Audio is recorded using the MediaRecorder API
2. Video interactions (play, pause, seek) are captured as events
3. Drawing annotations are captured with timestamps
4. Annotation category selections are recorded in real-time
5. All events are synchronized to a common timeline

### Replaying Sessions
1. Audio playback drives the main timeline
2. Video events are replayed at their recorded times
3. Annotations appear at their recorded timestamps
4. Annotation categories selected during recording are displayed
5. All components reset properly when replay completes

### Annotation Categories
1. Five key categories for annotation analysis:
   - Artistic Style
   - Character Design
   - Motion Dynamics
   - Color Palette
   - Narrative Techniques
2. Each category can be rated with 1-5 stars during recording
3. Category ratings are visible during replay with star display
4. Category ratings are included in saved session data

### Serialization
- Sessions can be saved as JSON files
- Audio data is stored in Azure Blob Storage with URL references
- For backward compatibility, audio can also be serialized as base64 strings
- Files can be reloaded for later replay

## Project Structure

```
cartoon-annotation-tool/
├── app/                  # Next.js app directory
│   ├── page.tsx          # Main application page
│   ├── layout.tsx        # App layout
│   ├── inbox/            # Video review inbox
│   │   └── page.tsx      # Inbox page component
│   ├── review/           # Video review page
│   │   └── page.tsx      # Review page component
│   ├── auth/             # Authentication pages
│   │   ├── register/     # User registration
│   │   └── signin/       # User sign-in
│   └── api/              # Backend API routes
│       ├── assessments/  # Assessment APIs
│       ├── audio/        # Audio handling APIs
│       ├── auth/         # Authentication APIs
│       └── videos/       # Videos API
│           ├── route.ts           # Cosmos DB CRUD operations
│           ├── session/           # Session management
│           └── updateSwing/       # Swing update endpoints
├── src/
│   ├── components/       # React components
│   │   ├── FeedbackOrchestrator.tsx   # Main coordination component
│   │   ├── VideoPlayerWrapper.tsx     # Container component
│   │   ├── VideoPlayer.tsx            # Custom video player
│   │   ├── AnnotationCanvas.tsx       # Drawing component
│   │   ├── AssessmentReviewModal.tsx  # Assessment review UI
│   │   ├── AudioRecorder.tsx          # Audio recording/playback
│   │   └── Navbar.tsx                 # Navigation component
│   ├── contexts/         # React contexts for state management
│   ├── lib/              # Library and utility functions
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── scripts/              # Helper scripts
│   ├── seed-cosmos-db.js # Database seeding script
│   └── seed-users.js     # User seeding script
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## Technical Details

- **Built with**: Next.js, React, TypeScript
- **Database**: Azure Cosmos DB (NoSQL)
- **Storage**: Azure Blob Storage for audio recordings
- **Backend API**: Next.js API routes
- **Audio**: Uses MediaRecorder API with format detection and Azure Storage integration
- **Drawing**: HTML5 Canvas for vector drawing
- **State Management**: React's Context and Refs for cross-component communication
- **Styling**: Tailwind CSS for responsive design

## Browser Compatibility

- Chrome (Desktop/Mobile): Full support
- Firefox (Desktop): Full support
- Safari (Desktop/iOS): Partial support - may require user interaction for audio playback
- Edge: Full support

## Potential Future Enhancements

- Visual timeline editor for post-recording edits
- Improved marker/comment system
- Video source selection
- Multiple annotation layers
- Custom annotation categories
- Categorization analytics and reporting
- Category-based filtering during replay
- Export to video format
- Shared/collaborative sessions
- Enhanced role-based access controls
- Real-time collaboration features
- Advanced search and filtering for the inbox
- Integration with video streaming services
- Custom dashboard with analytics

## Known Issues

- Safari may require explicit user interaction before audio playback
- Large recordings with many annotations may experience performance issues
- Some mobile browsers have limited MediaRecorder support