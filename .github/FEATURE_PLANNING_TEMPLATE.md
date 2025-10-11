# 🚀 Interactive Feature Planning & Development Framework

## Overview
This framework provides a structured approach to planning, architecting, and implementing features in your Vendure e-commerce project. It's designed to work seamlessly with GitHub Copilot and follows software engineering best practices.

## 📋 How to Use This Framework

1. **Copy this template** for each new feature
2. **Fill out each section** thoroughly before starting development
3. **Use GitHub Copilot** with the provided prompts and context
4. **Iterate and refine** the plan as you learn more about the requirements
5. **Update the plan** as implementation progresses

---

## 🎯 Feature Definition

### Feature Name
*[Clear, descriptive name for the feature]*

### Problem Statement
*[What problem are we solving? Who has this problem?]*

### Success Criteria
*[How will we know this feature is successful?]*
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### User Stories
*[From the perspective of different user types]*
- **As a [user type]**, I want [goal] so that [benefit]
- **As a [user type]**, I want [goal] so that [benefit]

---

## 🏗️ Technical Architecture

### System Context
*[How does this feature fit into the overall Vendure architecture?]*

### Components Affected
- [ ] **Frontend (Admin UI)**
  - Components: 
  - Routes:
  - State management:
- [ ] **Backend (Vendure Core)**
  - Services:
  - Entities:
  - Resolvers:
- [ ] **Database**
  - New tables:
  - Schema changes:
- [ ] **Plugins**
  - Custom plugins:
  - Third-party integrations:

### Architecture Decisions
*[Key technical decisions and their rationale]*

| Decision | Options Considered | Chosen Approach | Rationale |
|----------|-------------------|-----------------|-----------|
| | | | |

---

## 🔄 Implementation Plan

### Phase 1: Foundation
*[Core infrastructure and data models]*
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Phase 2: Core Logic
*[Business logic implementation]*
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Phase 3: Integration
*[API endpoints, UI components]*
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Phase 4: Polish & Testing
*[Testing, error handling, documentation]*
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Service layer tests
- [ ] Entity/model tests
- [ ] Utility function tests

### Integration Tests
- [ ] API endpoint tests
- [ ] Database integration tests
- [ ] Plugin integration tests

### E2E Tests
- [ ] User workflow tests
- [ ] Admin interface tests
- [ ] Performance tests

---

## 📚 Vendure-Specific Considerations

### Plugin Architecture
*[How does this feature integrate with Vendure's plugin system?]*

### GraphQL Schema
*[What new types, queries, mutations are needed?]*

### Event System
*[What events does this feature emit/listen to?]*

### Permissions & Security
*[What permissions are needed? Security considerations?]*

### Performance Impact
*[Database queries, caching strategies, scalability concerns]*

---

## 🤖 GitHub Copilot Integration Prompts

### Context Setting Prompt
```
I'm working on a Vendure e-commerce feature: [FEATURE_NAME]

Key context:
- Vendure version: [VERSION]
- Database: [DATABASE_TYPE]
- Plugin architecture: [DESCRIPTION]
- Business requirements: [BRIEF_SUMMARY]

The feature involves: [TECHNICAL_SUMMARY]

Please help me implement this following Vendure best practices.
```

### Code Generation Prompts
```
Generate a Vendure service for [FEATURE_NAME] that:
- Follows Vendure service patterns
- Includes proper error handling
- Uses TypeScript strict mode
- Integrates with the event system
```

```
Create a GraphQL resolver for [FEATURE_NAME] that:
- Implements proper authorization
- Handles input validation
- Returns appropriate error messages
- Follows Vendure resolver patterns
```

```
Design a database entity for [FEATURE_NAME] that:
- Uses Vendure entity conventions
- Includes proper relationships
- Has appropriate indexes
- Supports soft deletion if needed
```

---

## 🔍 Code Review Checklist

### Architecture
- [ ] Follows Vendure conventions
- [ ] Proper separation of concerns
- [ ] Appropriate use of design patterns
- [ ] Scalable and maintainable

### Code Quality
- [ ] TypeScript strict mode compliance
- [ ] Proper error handling
- [ ] Comprehensive logging
- [ ] Performance optimizations

### Security
- [ ] Proper authorization checks
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection

### Testing
- [ ] Adequate test coverage
- [ ] Integration tests pass
- [ ] Performance benchmarks met
- [ ] Edge cases covered

---

## 📖 Documentation Requirements

### Technical Documentation
- [ ] API documentation updated
- [ ] Plugin documentation created
- [ ] Database schema documented
- [ ] Configuration options documented

### User Documentation
- [ ] Admin UI guide updated
- [ ] Feature usage examples
- [ ] Migration guide (if needed)
- [ ] Troubleshooting guide

---

## 🚦 Definition of Done

- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Deployed to staging environment
- [ ] User acceptance testing passed

---

## 🔄 Iteration Notes

### Iteration 1: [Date]
*[What was learned? What changed?]*

### Iteration 2: [Date]
*[What was learned? What changed?]*

---

## 📞 Stakeholders & Communication

### Key Stakeholders
- **Product Owner**: [Name]
- **Technical Lead**: [Name]
- **QA Lead**: [Name]

### Communication Plan
- **Daily**: Progress updates in standup
- **Weekly**: Demo to stakeholders
- **Milestone**: Architecture review

---

*Last updated: [DATE]*
*Next review: [DATE]*