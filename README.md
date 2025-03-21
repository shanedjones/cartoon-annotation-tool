# Cartoon Annotation Tool

A Next.js application for recording, annotating, and replaying video sessions with synchronized audio, video, and drawing capabilities.

## Overview

This tool allows users to:
- Record synchronized audio while watching and interacting with videos
- Add visual annotations and drawings directly on the video
- Capture all video player interactions (play, pause, seek, etc.)
- Replay entire sessions with perfect audio-video-annotation synchronization
- Save and load feedback sessions as JSON files

## Installation & Setup

1. **Clone the repository**
   ```
   git clone https://github.com/shanedjones/cartoon-annotation-tool
   cd cartoon-annotation
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Run the development server**
   ```
   npm run dev
   ```

4. **Build for production**
   ```
   npm run build
   npm start
   ```

## Key Components

### FeedbackOrchestrator
- Core orchestration component that coordinates all events
- Manages recording and replay synchronization
- Uses an audio-based timeline as the primary synchronization mechanism
- Handles all events based on relative time offsets
- Doesn't render any UI itself (headless component)

### VideoPlayerWrapper
- Container component that integrates the orchestrator with UI components
- Manages UI state for recording/replaying
- Handles file saving and loading
- Provides reset behavior for recording and replay
- Serves as the main entry point for the application

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

## Key Features

### Recording Sessions
1. Audio is recorded using the MediaRecorder API
2. Video interactions (play, pause, seek) are captured as events
3. Drawing annotations are captured with timestamps
4. All events are synchronized to a common timeline

### Replaying Sessions
1. Audio playback drives the main timeline
2. Video events are replayed at their recorded times
3. Annotations appear at their recorded timestamps
4. All components reset properly when replay completes

### Serialization
- Sessions can be saved as JSON files
- Audio data is serialized as base64 strings
- Files can be reloaded for later replay

## Project Structure

```
cartoon-annotation/
├── app/                  # Next.js app directory
│   ├── page.tsx          # Main application page
│   └── layout.tsx        # App layout
├── src/
│   └── components/
│       ├── FeedbackOrchestrator.tsx   # Main coordination component
│       ├── VideoPlayerWrapper.tsx     # Container component
│       ├── VideoPlayer.tsx            # Custom video player
│       ├── AnnotationCanvas.tsx       # Drawing component
│       └── AudioRecorder.tsx          # Audio recording/playback
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## Technical Details

- **Built with**: Next.js, React, TypeScript
- **Audio**: Uses MediaRecorder API with format detection
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
- Export to video format
- Shared/collaborative sessions

## Known Issues

- Safari may require explicit user interaction before audio playback
- Large recordings with many annotations may experience performance issues
- Some mobile browsers have limited MediaRecorder support