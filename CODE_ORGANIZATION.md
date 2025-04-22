# Code Organization & Architecture

This document outlines our project structure and coding guidelines to ensure consistency and maintainability.

## Directory Structure

All source code resides in the `src/` directory, organized by feature/domain:

```
src/
├── app/             # Next.js App Router (pages, layouts, routes)
├── api/             # API routes and handlers
├── components/      # React components
├── contexts/        # React contexts
│   └── factory/     # Context factories
├── hooks/           # Custom React hooks
├── lib/             # External service integrations
├── middleware/      # Request middleware
├── styles/          # Global styles
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

## Organization Guidelines

### 1. Keep a Flat Structure

- Maximum 3 levels of nesting
- Example: `src/components/auth/LoginForm.tsx` (good)
- Avoid: `src/components/auth/forms/login/LoginForm.tsx` (too deep)

### 2. Group by Feature/Domain

- Place related code together
- Example: `src/components/video/` for all video-related components

### 3. Common Code Extraction

- Utility functions go in `src/utils/`
  - Examples: `formatUtils.ts`, `apiUtils.ts`, `mediaConversionUtils.ts`
- Shared types in `src/types/`
  - Group by domain: `annotation.ts`, `media.ts`, etc.
- Context factories in `src/contexts/factory/`

### 4. Naming Conventions

- Files: Use camelCase for utilities, PascalCase for components/contexts
- Directories: Use kebab-case or camelCase consistently
- Types: Use PascalCase for interfaces and types

### 5. Import Organization

- Use absolute imports from the root
- Example: `import { Button } from 'src/components/ui/Button'`
- Group imports by:
  1. External libraries
  2. Project imports
  3. Relative imports (if necessary)

## Implementation Notes

The reorganization script (`reorganize-project.sh`) helps migrate the existing codebase to this structure. After running it:

1. Update import paths in code files
2. Update Next.js configuration to use the new structure
3. After verification, remove the old `app/` directory

## Benefits

- Consistent organization where all team members know where to find code
- Simplified navigation with predictable paths
- Reduced duplication through better code sharing
- Easier scaling as the project grows

## Example Structure

Below is an example of how to organize components for the video annotation feature:

```
src/
├── components/
│   ├── annotation/
│   │   ├── AnnotationCanvas.tsx
│   │   ├── AnnotationControls.tsx
│   │   └── index.ts            # Re-export components
│   ├── video/
│   │   ├── VideoPlayer.tsx
│   │   ├── VideoControls.tsx
│   │   ├── VideoPlayerWrapper.tsx
│   │   └── index.ts
│   └── audio/
│       ├── AudioRecorder.tsx
│       └── index.ts
├── contexts/
│   ├── AnnotationContext.tsx
│   ├── VideoContext.tsx
│   ├── TimelineContext.tsx
│   └── factory/
│       ├── annotationFactory.ts
│       ├── videoFactory.ts
│       └── timelineFactory.ts
├── hooks/
│   ├── useAnnotation.ts
│   ├── useVideo.ts
│   └── useTimeline.ts
├── types/
│   ├── annotation.ts
│   ├── media.ts
│   └── timeline.ts
└── utils/
    ├── annotationUtils.ts
    ├── videoUtils.ts
    └── timelineUtils.ts
```

This structure keeps related components together while maintaining a clean organization by feature.