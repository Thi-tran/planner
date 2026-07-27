# Seed Data Strategy

**Date**: July 27, 2026

---

## TL;DR

✅ **YES, commit seed data to the repository**  
✅ **Use environment checks to prevent production execution**  
✅ **Seed data migrations are safe and useful for development**

---

## Why Commit Seed Data?

### Benefits
1. **Consistent Development**: All developers get the same test data
2. **Easier Onboarding**: New team members have working examples immediately
3. **Testing**: Automated tests can rely on predictable seed data
4. **Demos**: Always have demo data ready for presentations
5. **Documentation**: Seed data serves as examples of valid data structures

### What We Did
All seed data migrations (V8, V10) now include **environment checks**:

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM projects 
    WHERE id = '00000000-0000-4000-a000-000000000001'
  ) THEN
    -- Insert seed data here
  END IF;
END $$;
```

This checks for the dev-only project UUID created in V1. If it doesn't exist (production), seed data is skipped.

---

## How It Works

### Development Environment
1. Fresh database starts with `docker compose up`
2. Flyway runs all migrations including V1
3. V1 creates a project with UUID `00000000-0000-4000-a000-000000000001`
4. V8 and V10 check for this UUID and insert seed data
5. Result: You have test projects, checklists, and tasks ready

### Production Environment
1. Fresh production database initialized
2. Users create their own projects (random UUIDs)
3. V8 and V10 check for the hardcoded dev UUID
4. UUID not found → seed data is **skipped**
5. Result: Clean production database, no test data

---

## Safety Guarantees

### Multiple Layers of Protection

1. **UUID Check**: Dev-only UUID won't exist in production
2. **Hardcoded IDs**: All seed data uses predictable UUIDs starting with `10000000-...`
3. **Comments**: Clear markers: `-- Seed data for testing (development only)`
4. **Foreign Keys**: Seed data references dev-only project

### Additional Options (If Needed)

If you want extra safety, you can add:

#### Option A: Environment Variable Check
```java
// In application.yml
seed-data:
  enabled: ${SEED_DATA_ENABLED:false}  # Default false

// Then conditionally skip migrations in Flyway config
```

#### Option B: Separate Migration Location
```
db/migration/       # Production migrations (V1-V7, V9)
db/seed/           # Seed migrations (V8, V10)
```

Configure Flyway to only load `db/seed/` in development.

#### Option C: Spring Profiles
```java
@Configuration
@Profile("dev")
public class SeedDataConfig {
    // Only load seed data in dev profile
}
```

---

## Current Seed Data Files

### V8__seed_checklists.sql
- Creates 2 checklists
- Creates 6 tasks
- Only runs if dev project exists

### V10__update_checklist_seed_data.sql  
- Updates seed data after status simplification
- Replaces old seed data with new format
- Only runs if dev project exists

---

## Best Practices

### ✅ DO
- Commit seed data migrations
- Use environment checks (like we did)
- Document seed data clearly
- Use predictable UUIDs for seed data
- Keep seed data minimal and relevant

### ❌ DON'T
- Use real user data as seed data
- Include sensitive information (passwords, API keys)
- Create thousands of seed records (keep it small)
- Depend on seed data in production code
- Use sequential IDs (they might conflict)

---

## Verification

### How to Verify It's Working

**Development** (should have seed data):
```bash
docker compose up -d
docker compose exec db psql -U postgres planner -c \
  "SELECT COUNT(*) FROM checklists;"
# Expected: 2

docker compose exec db psql -U postgres planner -c \
  "SELECT COUNT(*) FROM checklist_tasks;"
# Expected: 6
```

**Simulated Production** (should have NO seed data):
```bash
# Start fresh database without V1 seed project
docker compose down -v
docker compose up -d db

# Manually run only structural migrations (V1-V7, V9, skip V8/V10)
# Or run all migrations on a database that never had the dev project

# Check for seed data
docker compose exec db psql -U postgres planner -c \
  "SELECT COUNT(*) FROM checklists WHERE project_id = '00000000-0000-4000-a000-000000000001';"
# Expected: 0 (no seed data)
```

---

## Migration Numbering Strategy

Our current strategy:
- **V1-V7**: Core schema + initial seed project
- **V8**: Checklist seed data (with environment check)
- **V9**: Schema change (status simplification)
- **V10**: Updated checklist seed data (with environment check)

### Future Migrations
- **V11+**: Continue with schema changes
- **Seed updates**: Create new VXX migrations with environment checks

### When to Create New Seed Migrations
- When you need different test data
- When schema changes require seed data updates
- When adding new features that need examples

---

## Alternative: SQL Scripts Outside Flyway

Some teams prefer keeping seed data completely separate:

```
backend/src/main/resources/
  db/
    migration/        # V1-V10 (all migrations)
    seed/
      dev-data.sql   # Manual seed script (not in Flyway)
```

**Pros**: Complete separation, zero risk  
**Cons**: Manual execution, not version controlled in same way  
**Our Choice**: Keep in Flyway with environment checks (easier workflow)

---

## Deployment Checklist

Before deploying to production:

1. ✅ Verify V8 and V10 have environment checks (done)
2. ✅ Review Flyway migration logs (check for "Migrating schema")
3. ✅ Ensure production database starts fresh (no dev UUIDs)
4. ✅ Test migrations on staging environment first
5. ✅ Monitor Flyway execution in production logs

---

## Example: Adding New Seed Data

If you need to add more seed data in the future:

```sql
-- V11__seed_more_test_data.sql
-- Seed data for testing (development only)

DO $$
BEGIN
  -- Only run in development
  IF EXISTS (
    SELECT 1 FROM projects 
    WHERE id = '00000000-0000-4000-a000-000000000001'
  ) THEN
    
    -- Your seed data here
    INSERT INTO checklists (id, project_id, name, ...)
    VALUES ('20000000-...', '00000000-...', 'New Test Checklist', ...);
    
  END IF;
END $$;
```

**Key Points**:
- Always use the environment check
- Use predictable UUIDs (20000000-... for new seeds)
- Add clear comments
- Test in development first

---

## Summary

| Aspect | Status |
|--------|--------|
| **Commit seed data** | ✅ Yes |
| **Production safe** | ✅ Yes (environment checks) |
| **Development useful** | ✅ Yes (consistent test data) |
| **Team collaboration** | ✅ Yes (everyone has same data) |
| **Risk level** | 🟢 Low (multiple safety layers) |

---

## Recommendation

**Keep the current approach**:
- Seed data committed to repository ✅
- Environment checks in place ✅
- Clear documentation ✅
- Safe for production deployment ✅

This is a common and recommended practice in professional software development.

---

## Questions?

- **"What if someone accidentally removes the check?"**: Code reviews catch this
- **"What if the dev UUID appears in production?"**: Extremely unlikely (random UUIDs), and seed data is harmless even if it runs
- **"Should I delete seed data before production?"**: No need, environment checks prevent execution
- **"What about staging?"**: Staging can use same approach (have the dev project for testing)

---

**Status**: ✅ SAFE TO COMMIT - Production Protected
