# 🤖 GitHub Copilot Prompts for Vendure Development

This collection provides specialized prompts to maximize GitHub Copilot's effectiveness when developing Vendure e-commerce features.

## 🎯 Context Setting Prompts

### Initial Project Context
```markdown
I'm working on a Vendure e-commerce project. Key details:

**Project Setup:**
- Vendure version: 2.x
- Database: PostgreSQL/MySQL
- TypeScript with strict mode
- Node.js backend with GraphQL API
- Angular Admin UI

**Architecture Context:**
- Plugin-based architecture
- Event-driven system
- Multi-tenant support
- REST and GraphQL APIs
- TypeORM for database
- NestJS framework integration

**Current Focus:**
[Describe current feature/task]

Please help me implement following Vendure best practices and patterns.
```

### Feature-Specific Context
```markdown
I'm implementing a [FEATURE_TYPE] feature in Vendure:

**Business Requirements:**
- [Requirement 1]
- [Requirement 2]

**Technical Requirements:**
- [Technical constraint 1]
- [Technical constraint 2]

**Integration Points:**
- [Service/Entity/Resolver to integrate with]

Generate code that follows Vendure conventions and TypeScript best practices.
```

## 🏗️ Architecture & Design Prompts

### Service Layer Prompts
```typescript
// Create a Vendure service for [FEATURE_NAME] that:
// - Extends from base Vendure service patterns
// - Implements proper dependency injection
// - Includes comprehensive error handling
// - Integrates with Vendure's event system
// - Uses TypeORM for database operations
// - Follows single responsibility principle

import { Injectable } from '@nestjs/common';
import { RequestContext } from '@vendure/core';

@Injectable()
export class [FeatureName]Service {
    // Copilot: Generate service implementation
}
```

### Entity Creation Prompts
```typescript
// Create a Vendure entity for [ENTITY_NAME] that:
// - Extends VendureEntity base class
// - Uses proper TypeORM decorations
// - Includes audit fields (createdAt, updatedAt)
// - Has appropriate relationships
// - Supports soft deletion
// - Includes proper indexing for performance

import { Entity, Column } from 'typeorm';
import { VendureEntity } from '@vendure/core';

@Entity()
export class [EntityName] extends VendureEntity {
    // Copilot: Generate entity definition
}
```

### GraphQL Resolver Prompts
```typescript
// Create a GraphQL resolver for [FEATURE_NAME] that:
// - Uses Vendure resolver decorators
// - Implements proper authorization with @Allow()
// - Validates input with class-validator
// - Handles errors gracefully
// - Returns appropriate GraphQL types
// - Logs important operations

import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Allow, Permission, RequestContext, Ctx } from '@vendure/core';

@Resolver()
export class [FeatureName]Resolver {
    // Copilot: Generate resolver implementation
}
```

## 🧩 Plugin Development Prompts

### Plugin Structure Prompt
```typescript
// Create a Vendure plugin for [PLUGIN_NAME] that:
// - Follows Vendure plugin architecture
// - Includes proper metadata and configuration
// - Extends both Admin and Shop APIs
// - Adds custom entities and services
// - Includes database migrations
// - Provides configuration options

import { PluginCommonModule, VendurePlugin } from '@vendure/core';

@VendurePlugin({
    // Copilot: Generate plugin configuration
})
export class [PluginName]Plugin {
    // Copilot: Generate plugin implementation
}
```

### Event Handler Prompts
```typescript
// Create an event handler for [EVENT_NAME] that:
// - Uses Vendure event bus
// - Handles events asynchronously
// - Includes proper error handling
// - Logs event processing
// - Follows event-driven architecture patterns

import { OnVendureBootstrap, EventBus } from '@vendure/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class [EventName]Handler implements OnVendureBootstrap {
    // Copilot: Generate event handler implementation
}
```

## 📊 Database & Migration Prompts

### Migration Prompts
```typescript
// Create a TypeORM migration for [FEATURE_NAME] that:
// - Adds new tables with proper foreign keys
// - Includes appropriate indexes
// - Handles data migration if needed
// - Includes rollback logic
// - Follows naming conventions

import { MigrationInterface, QueryRunner } from 'typeorm';

export class [MigrationName][Timestamp] implements MigrationInterface {
    // Copilot: Generate migration up/down methods
}
```

## 🎨 Frontend (Admin UI) Prompts

### Angular Component Prompts
```typescript
// Create an Angular component for [COMPONENT_NAME] that:
// - Uses Vendure admin UI components
// - Implements Clarity design system
// - Includes proper form validation
// - Handles loading states
// - Uses reactive forms
// - Follows Vendure admin UI patterns

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
    selector: 'app-[component-name]',
    template: `
        <!-- Copilot: Generate component template -->
    `,
})
export class [ComponentName]Component implements OnInit {
    // Copilot: Generate component implementation
}
```

### Data Service Prompts
```typescript
// Create an Angular service for [SERVICE_NAME] that:
// - Uses Vendure's BaseDataService
// - Implements GraphQL operations
// - Handles error responses
// - Provides Observable streams
// - Includes proper typing

import { Injectable } from '@angular/core';
import { BaseDataService, DocumentNode } from '@vendure/admin-ui/core';

@Injectable()
export class [ServiceName]DataService {
    // Copilot: Generate data service implementation
}
```

## 🧪 Testing Prompts

### Unit Test Prompts
```typescript
// Create unit tests for [CLASS_NAME] that:
// - Use Jest testing framework
// - Mock dependencies appropriately
// - Test happy path and error scenarios
// - Include edge cases
// - Follow AAA pattern (Arrange, Act, Assert)
// - Achieve high test coverage

describe('[ClassName]', () => {
    // Copilot: Generate comprehensive unit tests
});
```

### Integration Test Prompts
```typescript
// Create integration tests for [FEATURE_NAME] that:
// - Use Vendure testing framework
// - Set up test database
// - Test full request/response cycle
// - Include authentication scenarios
// - Test GraphQL operations
// - Clean up test data

import { createTestEnvironment, TestServer } from '@vendure/testing';

describe('[FeatureName] integration tests', () => {
    // Copilot: Generate integration test suite
});
```

## 📚 Documentation Prompts

### API Documentation Prompts
```markdown
Generate comprehensive API documentation for [FEATURE_NAME] including:
- GraphQL schema definitions
- Input/output types
- Example queries and mutations
- Error responses
- Usage examples
- Authentication requirements
```

### README Documentation Prompts
```markdown
Create a README for [FEATURE/PLUGIN_NAME] that includes:
- Clear feature description
- Installation instructions
- Configuration options
- Usage examples
- API reference
- Troubleshooting guide
- Contributing guidelines
```

## 🔧 Configuration Prompts

### Environment Configuration
```typescript
// Create configuration schema for [FEATURE_NAME] that:
// - Uses class-validator for validation
// - Includes environment variable mapping
// - Provides default values
// - Includes documentation comments
// - Supports different environments

export interface [FeatureName]Config {
    // Copilot: Generate configuration interface
}
```

## 💡 Best Practices Integration

### Code Review Prompts
```markdown
Review this Vendure code for:
- Adherence to Vendure conventions
- TypeScript best practices
- Security considerations
- Performance implications
- Error handling completeness
- Test coverage adequacy

[PASTE CODE HERE]
```

### Refactoring Prompts
```typescript
// Refactor this code to follow Vendure best practices:
// - Improve separation of concerns
// - Enhance error handling
// - Optimize database queries
// - Add proper typing
// - Implement caching where appropriate

[PASTE EXISTING CODE HERE]
// Copilot: Suggest improvements and refactor
```

---

## 🚀 Usage Tips

1. **Be Specific**: Include exact feature names, requirements, and context
2. **Use Comments**: Add detailed comments above code blocks for better suggestions
3. **Iterate**: Start with basic structure, then add complexity
4. **Context Matters**: Always provide Vendure-specific context for better results
5. **Review Generated Code**: Always review and test generated code thoroughly

Remember: These prompts are starting points. Adapt them to your specific needs and always validate generated code against Vendure best practices.