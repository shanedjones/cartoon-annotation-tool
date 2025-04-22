# Epic 1: Context System Refactoring

**Description:** Complete the migration to the factory pattern for React contexts, ensuring consistency across the codebase.

## Stories

### Story 1.1: Audit Current Context Implementation

**Description:** Review all context implementations to identify inconsistencies and determine the work needed.

**Tasks:**
- Analyze all files in `/src/contexts/` and its subdirectories
- Document which contexts already use the factory pattern
- Identify contexts still using old patterns
- Create a migration priority list based on dependencies

**Acceptance Criteria:**
- Complete documentation of all contexts and their current implementation patterns
- Migration priority list with dependency graph
- Inventory of all custom hooks derived from contexts

### Story 1.2: Finalize Context Factory Pattern

**Description:** Enhance and finalize the context factory pattern to support all use cases.

**Tasks:**
- Review the existing `createContext.ts` and `createReducerContext.ts` implementations
- Add support for any missing features (e.g., automatic memoization, middleware)
- Create type-safe interfaces for all factory functions
- Document the finalized pattern for team reference

**Acceptance Criteria:**
- Enhanced context factory with proper TypeScript typing
- Support for all identified context patterns (basic, reducer, etc.)
- Documentation for team members on how to use the factory pattern

**Example Implementation:**
```typescript
// Enhanced createContextFactory
export function createContextFactory<T, A = any>(
  displayName: string,
  defaultValue: T | null = null,
  createState: () => T,
  options?: {
    enableMemoization?: boolean;
    middleware?: ContextMiddleware<T>[];
  }
): ContextFactoryResult<T, A> {
  // Implementation details
}
```

### Story 1.3: Migrate VideoContext to Factory Pattern

**Description:** Refactor the VideoContext to use the new factory pattern.

**Tasks:**
- Create new implementation in `/src/contexts/factory/videoFactory.ts`
- Ensure all current functionality is preserved
- Update imports in all components using VideoContext
- Add tests for the new implementation

**Acceptance Criteria:**
- VideoContext fully migrated to use the factory pattern
- All components updated to use the new context hooks
- Test coverage for core functionality
- No regression in video player features

### Story 1.4: Migrate Remaining Contexts to Factory Pattern

**Description:** Refactor all remaining contexts to use the new factory pattern.

**Tasks:**
- Refactor each context according to the priority list
- Update imports in all affected components
- Remove deprecated context implementations
- Add tests for each refactored context

**Acceptance Criteria:**
- All contexts consistently using the factory pattern
- No deprecated context implementations in the codebase
- All components updated to use the new context hooks
- Test coverage for each context

### Story 1.5: Remove Backward Compatibility Code

**Description:** Clean up backward compatibility code that's no longer needed after context refactoring.

**Tasks:**
- Execute the existing `cleanup-backwards-compatibility.js` script
- Remove all global window variable access for state management
- Remove compatibility components and effects
- Update documentation to reflect the new architecture

**Acceptance Criteria:**
- No global window variable access for state management
- No compatibility components or effects
- All documentation updated to reflect current architecture
- Clean implementation that doesn't rely on global state
