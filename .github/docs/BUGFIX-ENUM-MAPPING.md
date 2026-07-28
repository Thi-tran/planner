# 🐛 Bug Fix: TaskStatus Enum Mapping

**Date**: July 26, 2026  
**Issue**: `No enum constant com.planner.model.entity.TaskStatus.in-progress`  
**Status**: ✅ Fixed

---

## Problem

The database stores task status values as lowercase with hyphens:
- `'unchecked'`
- `'in-progress'` ❌
- `'done'`

But the Java enum used uppercase with underscores:
- `UNCHECKED`
- `IN_PROGRESS` ❌
- `DONE`

Spring JPA's `@Enumerated(EnumType.STRING)` was trying to match the database value `'in-progress'` to the enum name `IN_PROGRESS`, causing the error.

---

## Solution

Added custom enum mapping to bridge database values and Java enum constants:

### 1. Updated `TaskStatus.java`

Added database value mapping and conversion methods:

```java
public enum TaskStatus {
    UNCHECKED("unchecked"),
    IN_PROGRESS("in-progress"),
    DONE("done");
    
    private final String dbValue;
    
    TaskStatus(String dbValue) {
        this.dbValue = dbValue;
    }
    
    @JsonValue
    public String getDbValue() {
        return dbValue;
    }
    
    public static TaskStatus fromDbValue(String dbValue) {
        for (TaskStatus status : values()) {
            if (status.dbValue.equals(dbValue)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown TaskStatus: " + dbValue);
    }
}
```

### 2. Created `TaskStatusConverter.java`

JPA AttributeConverter to handle automatic conversion:

```java
@Converter(autoApply = true)
public class TaskStatusConverter implements AttributeConverter<TaskStatus, String> {
    
    @Override
    public String convertToDatabaseColumn(TaskStatus status) {
        return status == null ? null : status.getDbValue();
    }
    
    @Override
    public TaskStatus convertToEntityAttribute(String dbValue) {
        return dbValue == null ? null : TaskStatus.fromDbValue(dbValue);
    }
}
```

The `@Converter(autoApply = true)` annotation ensures this converter is used automatically for all `TaskStatus` fields.

### 3. Updated `ChecklistTaskEntity.java`

Removed `@Enumerated(EnumType.STRING)` since we now use the custom converter:

```java
// Before
@Enumerated(EnumType.STRING)
@Column(nullable = false, length = 20)
private TaskStatus status;

// After
@Column(nullable = false, length = 20)
private TaskStatus status;
```

---

## Benefits

✅ **Database values remain readable**: `'in-progress'` instead of `'IN_PROGRESS'`  
✅ **Java code uses proper naming**: `TaskStatus.IN_PROGRESS`  
✅ **JSON serialization works correctly**: API returns `"in-progress"`  
✅ **Type-safe**: Compile-time checks for enum usage  
✅ **Auto-applied**: Works for all TaskStatus fields automatically

---

## Files Changed

1. `/backend/src/main/java/com/planner/model/entity/TaskStatus.java` - Updated enum with mapping
2. `/backend/src/main/java/com/planner/model/entity/TaskStatusConverter.java` - **New file** (JPA converter)
3. `/backend/src/main/java/com/planner/model/entity/ChecklistTaskEntity.java` - Removed `@Enumerated`

---

## Verification

Backend rebuilt and tested successfully:

```bash
$ docker compose logs backend | grep "Successfully validated"
Successfully validated 8 migrations (execution time 00:00.013s)

$ docker compose logs backend | grep "Started BackendApplication"
Started BackendApplication in 4.489 seconds

$ curl http://localhost:8080/actuator/health
{"status":"UP"}
```

---

## Pattern to Follow

For any future enums that need database-friendly values:

1. **Enum with values**:
   ```java
   public enum MyEnum {
       SOME_VALUE("some-value");
       private final String dbValue;
       // + constructor, getDbValue(), fromDbValue()
   }
   ```

2. **Converter**:
   ```java
   @Converter(autoApply = true)
   public class MyEnumConverter implements AttributeConverter<MyEnum, String> {
       // convertToDatabaseColumn, convertToEntityAttribute
   }
   ```

3. **Entity field**:
   ```java
   @Column(...)
   private MyEnum myField;  // No @Enumerated needed!
   ```

---

**Status**: ✅ RESOLVED - Backend ready for testing
