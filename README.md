# Project Reorganization

## Code Organization Plan

We've implemented a code organization plan to establish a clear and consistent project structure. This helps team members know where to find and add code.

### Key Changes

1. **Consolidated Directory Structure**
   - All source code now lives in `src/`
   - Next.js app directory moved to `src/app/`
   - API routes in `src/api/`

2. **Feature/Domain Organization**
   - Components grouped by feature (e.g., `video/`, `annotation/`)
   - Limited to 3 levels of nesting for simplicity

3. **Common Module Extraction**
   - Utilities in `src/utils/`
   - Types in `src/types/`
   - Context factories in `src/contexts/factory/`

### Implementation

To apply these changes:

```bash
npm run reorganize
```

This will:
1. Copy files to the new structure
2. Keep the old structure intact for reference

After running the script, you'll need to:
1. Update import paths using the IMPORT_GUIDE.md reference
2. Verify the app works correctly
3. Remove the old structure once everything works

### Documentation

For more details, see:
- CODE_ORGANIZATION.md - Full structure guidelines
- IMPORT_GUIDE.md - How to update import paths

### Benefits

- Consistent code organization
- Simplified navigation
- Reduced duplication
- Better scalability