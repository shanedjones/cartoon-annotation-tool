# Import Path Guide

This guide will help you update import paths to match our new code organization structure.

## Before vs. After

Below are examples of how imports should change:

### Component Imports

**Before:**
```typescript
import VideoPlayer from '../../../components/VideoPlayer';
```

**After:**
```typescript
import { VideoPlayer } from 'src/components/video';
```

### Context Imports

**Before:**
```typescript
import { useAnnotationContext } from '../contexts/AnnotationContext';
```

**After:**
```typescript
import { useAnnotationContext } from 'src/contexts/AnnotationContext';
// Or if you have hooks
import { useAnnotation } from 'src/hooks/useAnnotation';
```

### API Route Imports

**Before:**
```typescript
import { createVideo } from '../../app/api/videos/route';
```

**After:**
```typescript
import { createVideo } from 'src/api/videos';
```

### Utility Imports

**Before:**
```typescript
import { formatTime } from '../../utils/formatUtils';
```

**After:**
```typescript
import { formatTime } from 'src/utils/formatUtils';
```

## Search and Replace

When updating imports, look for these patterns:

1. Relative imports with multiple levels (`../../../`)
2. Imports that reference `app/` directory
3. Direct imports of files vs. directory indices

## Tips

- Use the VS Code search feature to find import statements that need updating
- Consider using barrel files (index.ts) to simplify imports from directories with multiple files
- Remember to update both import paths and exported component names if you've reorganized components into subdirectories

## Verification

After updating imports:

1. Run `npm run type-check` to verify TypeScript can resolve all imports
2. Run `npm run lint` to ensure code style is consistent
3. Run `npm run test` to verify all tests pass with the new structure