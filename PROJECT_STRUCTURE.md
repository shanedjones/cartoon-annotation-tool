# Project Structure

This document outlines the structure of the Cartoon Annotation Tool application.

## Directory Structure

The project follows the modern Next.js App Router structure:

- `/app`: Contains the Next.js application routes, pages, and API routes
- `/src`: Contains reusable components, contexts, utilities, and business logic
- `/public`: Static assets

### Key Directories

- `/app`: Application routes and pages using Next.js App Router
- `/app/api`: API routes for backend functionality
- `/src/components`: Reusable React components
- `/src/contexts`: React context providers for state management
- `/src/utils`: Utility functions
- `/src/types`: TypeScript type definitions
- `/src/state`: State management logic

## Recent Improvements

The project structure has been cleaned up to remove duplicate/redundant directories:

1. Removed empty `/src/app` and `/src/api` directories
   - These were duplicates of the main `/app` directory
   - All routes are now properly located in the `/app` directory

2. Removed redundant `src\` directory
   - This appeared to be an error or artifact in the directory structure

3. Updated imports and references
   - Ensured all imports are using the correct paths
   - Used the `@/` alias consistently for imports from the project root

4. Removed custom video caching for HTTP caching
   - Replaced IndexedDB-based custom caching with standard HTTP caching
   - Added appropriate cache control headers to API responses

## Coding Conventions

The project uses several coding conventions:

- TypeScript for type safety
- React functional components with hooks
- Context API for state management
- Next.js API routes for backend functionality
- Tailwind CSS for styling

## Import Paths

The project uses the `@/` path alias for imports from the project root. For example:

```tsx
import { Component } from '@/src/components/Component';
import { useContext } from '@/src/contexts/SomeContext';
```

This provides a consistent way to import files from anywhere in the project without using relative paths.