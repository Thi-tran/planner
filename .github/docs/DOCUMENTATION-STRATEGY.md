# Documentation Strategy

**Date**: July 27, 2026

---

## Why I Created Multiple Files

### The Problem
During the checklist feature implementation, I created 3 plan files:
1. `checklist-feature-implementation.md` (original)
2. `REVISED-checklist-plan.md` (after grilling)
3. `checklist-feature-implementation-REVISED.md` (another iteration)

This happened because I was documenting each step of the planning process.

### The Issue
- **Clutter**: Multiple similar files confuse readers
- **Redundancy**: Information repeated across files
- **Maintenance**: Hard to keep all files updated
- **Unclear**: Which file is the "source of truth"?

---

## Better Approach (Now Implemented)

### `/plans/` Directory - Planning Documents
**Purpose**: High-level feature plans, requirements, architectural decisions

**One file per feature** (consolidated):
- `checklist-feature.md` - Complete plan with status
- `calendar-view.md` - Calendar feature plan
- `event-categories.md` - Categories plan
- `project-management-system.md` - Project system plan

**Structure**:
```markdown
# Feature Name - Plan

**Status**: ✅ Complete / 🚧 In Progress / 📋 Planned
**Date**: [Date range]

## Overview
[What, why, scope]

## Implementation Summary
[High-level what was done]

## Key Decisions
[Why we made certain choices]

## Files Changed
[Quick reference]

## Phase 2 (Future)
[What's not done yet]
```

### `/docs/` Directory - Detailed Documentation
**Purpose**: Implementation details, bug fixes, how-tos, references

**Specific documentation files**:
- `CHECKLIST-IMPLEMENTATION-COMPLETE.md` - Detailed checklist walkthrough
- `TASK-STATUS-SIMPLIFICATION-COMPLETE.md` - Status change details
- `PROJECT-PROGRESS-BAR-COMPLETE.md` - Progress bar implementation
- `BUGFIX-ENUM-MAPPING.md` - Specific bug fix
- `SEED-DATA-STRATEGY.md` - How we handle seed data
- `ARCHITECTURE.md` - Overall system architecture

**When to create docs/ files**:
- ✅ Detailed implementation walkthrough
- ✅ Bug fix explanation
- ✅ Strategy document (testing, deployment, etc.)
- ✅ Technical deep-dive
- ❌ Not for planning iterations
- ❌ Not for status updates

---

## File Naming Conventions

### Plans (`/plans/`)
- **Pattern**: `feature-name.md`
- **Examples**:
  - `checklist-feature.md`
  - `calendar-view.md`
  - `authentication-flow.md`

### Documentation (`/docs/`)
- **Pattern**: `PURPOSE-TOPIC-OPTIONAL.md`
- **Examples**:
  - `BUGFIX-enum-mapping.md`
  - `IMPLEMENTATION-checklist-complete.md`
  - `STRATEGY-seed-data.md`
  - `ARCHITECTURE.md`

### All Caps for Important Docs
Use ALL CAPS for:
- ARCHITECTURE
- README
- CHANGELOG
- CONTRIBUTING
- LICENSE

---

## Documentation Lifecycle

### 1. Planning Phase
**Create**: `/plans/feature-name.md`
- Status: 📋 Planned
- Contains: Requirements, architecture, approach
- **Update in place** as plan evolves (don't create new files)

### 2. Implementation Phase
**Update**: `/plans/feature-name.md`
- Status: 🚧 In Progress
- Add implementation notes as you go
- **Create** `/docs/` files for:
  - Detailed how-tos
  - Bug fixes
  - Special techniques

### 3. Completion Phase
**Update**: `/plans/feature-name.md`
- Status: ✅ Complete
- Add summary of what was delivered
- Add "Phase 2" section for future work

**Create**: `/docs/IMPLEMENTATION-feature-name-complete.md`
- Only if feature is complex
- Detailed walkthrough
- Testing procedures
- Known limitations

### 4. Maintenance Phase
**Create**: `/docs/BUGFIX-specific-issue.md`
- Only for interesting/complex bugs
- Explain problem, solution, prevention
- Reference in git commit message

---

## What NOT to Document

❌ Don't create files for:
- Every code change
- Minor UI tweaks
- Simple bug fixes (use git commit messages)
- Work-in-progress thoughts (use comments in code)
- Planning iterations (update existing plan)

✅ DO create files for:
- New features (plan + summary)
- Complex implementations
- Architectural decisions
- Bug fixes that need explanation
- Strategies and approaches

---

## Current Documentation Structure

```
.github/
├── plans/                          # Feature plans
│   ├── checklist-feature.md       # ✅ Consolidated
│   ├── calendar-view.md
│   ├── event-categories.md
│   └── project-management-system.md
│
└── docs/                           # Detailed documentation
    ├── ARCHITECTURE.md             # System overview
    ├── IMPLEMENTATION_SUMMARY.md   # What's been built
    │
    ├── Checklists Feature
    ├── CHECKLIST-IMPLEMENTATION-COMPLETE.md
    ├── TASK-STATUS-SIMPLIFICATION-COMPLETE.md
    ├── PROJECT-PROGRESS-BAR-COMPLETE.md
    ├── UI-IMPROVEMENTS-CHECKLIST.md
    ├── BUGFIX-ENUM-MAPPING.md
    │
    ├── Strategies
    ├── SEED-DATA-STRATEGY.md
    ├── DOCUMENTATION-STRATEGY.md  # This file
    │
    └── Bug Fixes
        ├── BUGFIX-PARAMS-PROMISE.md
        └── BUGFIX-SUSPENSE-BOUNDARY.md
```

---

## Guidelines for AI Assistants (Like Me!)

### When Planning a Feature
1. ✅ Create ONE plan file: `/plans/feature-name.md`
2. ✅ Update it in place as plan evolves
3. ❌ Don't create separate "revised" versions
4. ✅ Mark sections as you complete them
5. ✅ Update status at the top

### When Documenting Implementation
1. ✅ Keep detailed notes in `/docs/IMPLEMENTATION-*.md`
2. ✅ One implementation doc per complex feature
3. ❌ Don't duplicate info from plan
4. ✅ Focus on HOW it works, testing, gotchas

### When Fixing Bugs
1. ✅ Create `/docs/BUGFIX-*.md` for complex bugs
2. ❌ Don't document simple fixes (use git)
3. ✅ Explain: problem, root cause, solution, prevention

### When Explaining Strategies
1. ✅ Create `/docs/STRATEGY-*.md` or `/docs/*-STRATEGY.md`
2. ✅ Cover: why, how, alternatives, best practices
3. ✅ Include examples and verification steps

---

## Markdown Best Practices

### Structure
```markdown
# Title

**Status**: ✅ Complete
**Date**: July 27, 2026

---

## Overview
[Concise summary]

---

## Detailed Sections
[Content organized with headers]

---

**Status**: ✅ Current state
```

### Status Indicators
- ✅ Complete
- 🚧 In Progress
- 📋 Planned
- ❌ Not in scope
- ⚠️ Needs attention

### Use Tables for Comparisons
| Before | After |
|--------|-------|
| Old way | New way |

### Use Code Blocks with Language
```java
// Java code
```

```typescript
// TypeScript code
```

```sql
-- SQL code
```

---

## Cleanup Checklist

When you have multiple plan files:
1. ✅ Read all versions
2. ✅ Identify what's unique in each
3. ✅ Create consolidated version with:
   - Latest plan details
   - Implementation summary
   - Key decisions
   - Status
4. ✅ Delete old versions
5. ✅ Update references in other docs

---

## Summary

**Golden Rule**: One source of truth per feature

- **Plans** (`/plans/`): One file per feature, update in place
- **Docs** (`/docs/`): Detailed implementations, strategies, bug fixes
- **Status**: Always current, not historical
- **Git History**: Use git for historical record, not multiple files

This keeps documentation clean, maintainable, and useful.

---

**Status**: ✅ STRATEGY DOCUMENTED
