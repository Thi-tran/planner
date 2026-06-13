# Backend Architecture Summary

## Project Structure Reorganization

The backend project has been organized into a clean layered architecture with clear separation of concerns. Below is the package structure:

```
com.planner/
├── BackendApplication.java          # Spring Boot entry point
├── configuration/                   # Configuration layer
│   ├── CorsConfiguration.java       # CORS configuration
│   └── GlobalExceptionHandler.java  # Centralized error handling
├── controller/                      # HTTP API layer
│   └── EventController.java        # REST endpoints for events
├── domain/                          # Domain transfer objects
│   ├── EventRequest.java           # Request payload (DTO)
│   └── EventResponse.java          # Response payload (DTO)
├── exception/                       # Custom exceptions
│   └── ResourceNotFoundException.java
├── mapper/                         # Mapping layer
│   └── EventMapper.java            # DTO ↔ Entity conversions
├── model/                          # Model layer (entities & data access)
│   ├── Event.java                  # JPA entity (database mapping)
│   ├── EventRepository.java        # Data access interface
│   └── EventSpecification.java     # JPA specifications for dynamic queries
└── service/                        # Business logic layer
    └── EventService.java           # Core event operations
```

## Layer Responsibilities

### 1. **Configuration** (`com.planner.configuration`)
Handles Spring framework configuration and cross-cutting concerns:
- **CorsConfiguration**: Configures CORS policies for the API
- **GlobalExceptionHandler**: Centralized exception handling for consistent error responses

### 2. **Controller** (`com.planner.controller`)
HTTP API endpoint definitions:
- **EventController**: Handles REST endpoints (`/api/events`) with CRUD operations
- Responsible for request/response handling and HTTP status codes
- Delegates business logic to services

### 3. **Domain** (`com.planner.domain`)
Data transfer objects for API communication (DTOs):
- **EventRequest**: Incoming event data with validation
  - Validates title (not blank), time range (endTime > startTime)
  - Color format validation (hex color format)
- **EventResponse**: Outgoing event data (record type)
  - Read-only representation of an event

### 4. **Model** (`com.planner.model`)
Core business entities, data access, and query specifications:
- **Event**: JPA entity mapped to the `events` table
  - Contains all persistent attributes (id, title, description, timestamps, etc.)
  - Includes JPA lifecycle callbacks (@PrePersist, @PreUpdate)
- **EventRepository**: Spring Data JPA interface for database operations
  - Extends `JpaRepository<Event, UUID>` and `JpaSpecificationExecutor<Event>`
  - Provides CRUD operations
  - Custom query: `findByStartTimeLessThanAndEndTimeGreaterThan()` for event overlaps
- **EventSpecification**: JPA Specification patterns for dynamic queries
  - `overlapsRange()`: Find events overlapping a time range
  - `titleContains()`: Find events by title (case-insensitive)
  - `colorEquals()`: Find events by color

### 5. **Mapper** (`com.planner.mapper`)
Conversion logic between layers:
- **EventMapper**: Component for converting between DTOs and domain entities
  - `toResponse()`: Event → EventResponse
  - `toEntity()`: EventRequest → Event
  - `mapRequestToEntity()`: Updates existing Event from EventRequest

### 6. **Service** (`com.planner.service`)
Business logic and transaction management:
- **EventService**: Orchestrates event operations
  - `findEvents()`: Query events by date range
  - `findById()`: Retrieve single event
  - `create()`: Create new event
  - `update()`: Update existing event
  - `delete()`: Remove event
  - Uses @Transactional for data consistency

### 7. **Exception** (`com.planner.exception`)
Custom exception classes:
- **ResourceNotFoundException**: Thrown when event not found

## Data Flow

```
HTTP Request
    ↓
[EventController]  - Accepts @Valid EventRequest
    ↓
[EventService]  - Calls mapper & repository
    ↓
[EventMapper]  - Converts EventRequest → Event
    ↓
[EventRepository]  - Persists to database (or uses EventSpecification for queries)
    ↓
[Event]  - Retrieved from database
    ↓
[EventMapper]  - Converts Event → EventResponse
    ↓
[EventController]  - Returns HTTP response
    ↓
HTTP Response
```

## Key Design Patterns

### Separation of Concerns
- **Domain** (DTOs): Represents API contracts
- **Model** (Entity): Represents database schema
- **Mapper**: Converts between different representations
- **Service**: Orchestrates business logic
- **Controller**: Handles HTTP concerns

### Query Pattern
- **Repository**: Standard CRUD operations and custom queries
- **Specification**: Provides reusable, composable query predicates for complex queries

### Validation
- Request-level validation in EventRequest (@NotBlank, @NotNull, @Pattern, @AssertTrue)
- Response-level validation handled by Spring's @Valid annotation

### Transaction Management
- Service methods use @Transactional for ACID properties
- Ensures data consistency across create/update/delete operations

### Error Handling
- Centralized in GlobalExceptionHandler
- Consistent error response format across the API

## Advantages of This Structure

1. **Scalability**: Easy to add new features (new entities, services, controllers)
2. **Maintainability**: Clear responsibility for each layer
3. **Testability**: Each layer can be tested independently
4. **Flexibility**: DTOs allow API contracts to evolve independently of database schema
5. **Reusability**: Service and mapper logic can be used by different controllers/clients
6. **Query Flexibility**: Specifications enable dynamic query building without tight coupling

## Package Organization Summary

| Package | Purpose | Key Classes |
|---------|---------|-------------|
| `configuration` | Framework setup | CorsConfiguration, GlobalExceptionHandler |
| `controller` | HTTP endpoints | EventController |
| `domain` | DTOs | EventRequest, EventResponse |
| `exception` | Custom exceptions | ResourceNotFoundException |
| `mapper` | Object conversion | EventMapper |
| `model` | Entities & data access | Event, EventRepository, EventSpecification |
| `service` | Business logic | EventService |

## Future Enhancements

This structure supports easy addition of:
- Authentication/Authorization (configuration package)
- Caching layer (between service and repository)
- Event validation rules (service package)
- Multiple data sources (model package)
- GraphQL or gRPC endpoints (new controller packages)
- Advanced query filters (new specifications)


