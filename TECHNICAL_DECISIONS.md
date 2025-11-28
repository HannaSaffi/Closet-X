# Closet-X Technical Decision Records (TDRs)

**Version:** 1.0  
**Last Updated:** November 25, 2025  
**Team:** Team Kates (Kuany Kuany, Hanna Saffi, [Your Name])

---

## Table of Contents

1. [Overview](#overview)
2. [Decision 1: MongoDB vs PostgreSQL](#decision-1-mongodb-vs-postgresql)
3. [Decision 2: Microservices vs Monolith](#decision-2-microservices-vs-monolith)
4. [Decision 3: RabbitMQ vs Kafka](#decision-3-rabbitmq-vs-kafka)
5. [Decision 4: GridFS vs S3](#decision-4-gridfs-vs-s3)
6. [Decision 5: JWT vs Session Tokens](#decision-5-jwt-vs-session-tokens)
7. [Decision 6: Node.js vs Other Runtimes](#decision-6-nodejs-vs-other-runtimes)
8. [Decision 7: Ollama vs OpenAI](#decision-7-ollama-vs-openai)
9. [Decision 8: REST vs GraphQL](#decision-8-rest-vs-graphql)
10. [Decision 9: React vs Other Frameworks](#decision-9-react-vs-other-frameworks)
11. [Decision 10: Kubernetes vs Docker Swarm](#decision-10-kubernetes-vs-docker-swarm)

---

## Overview

This document records significant architectural and technical decisions made during the Closet-X project development. Each decision follows the Architecture Decision Record (ADR) format:

- **Context**: What factors influenced the decision
- **Decision**: What was chosen
- **Rationale**: Why this choice was made
- **Consequences**: Trade-offs and implications
- **Alternatives Considered**: What else was evaluated

---

## Decision 1: MongoDB vs PostgreSQL

**Date**: September 15, 2025  
**Status**: ✅ Accepted  
**Deciders**: Team Kates (unanimous)

### Context

We needed to choose a database for storing user data, clothing items with metadata, and outfit information. The data model includes:
- Varied clothing attributes (some items have brands, some don't)
- Complex nested objects (color, aiAnalysis)
- Large binary files (images)
- Potential for schema evolution

### Decision

**Chosen**: MongoDB with GridFS for image storage

### Rationale

1. **Flexible Schema**
   - Clothing items have highly variable attributes
   - Easy to add new fields without migrations
   - JSON documents map naturally to JavaScript objects

2. **GridFS Built-in**
   - Native support for storing large files (images)
   - Eliminates dependency on external storage (S3, Azure Blob)
   - Simplifies architecture for homelab deployment

3. **Development Speed**
   - Faster prototyping with flexible schema
   - No need to design perfect schema upfront
   - Mongoose provides excellent ODM for Node.js

4. **Horizontal Scalability**
   - Built-in sharding for future growth
   - Replica sets for high availability
   - Better for write-heavy workloads (photo uploads)

5. **Team Familiarity**
   - Team has MongoDB experience
   - Extensive documentation and community support
   - Good integration with Node.js ecosystem

### Consequences

**Positive**:
- ✅ Rapid development and iteration
- ✅ Easy to adapt to changing requirements
- ✅ GridFS eliminates external storage dependency
- ✅ Natural fit for microservices (database per service)

**Negative**:
- ❌ Less rigid data integrity (no foreign keys)
- ❌ Larger storage footprint than PostgreSQL
- ❌ Eventual consistency in some scenarios
- ❌ No ACID transactions across collections (until 4.0)

**Mitigation Strategies**:
- Application-level validation for data integrity
- Use indexes strategically to maintain performance
- Accept eventual consistency for non-critical operations
- Implement cleanup jobs for orphaned data

### Alternatives Considered

#### **PostgreSQL**
**Pros**:
- ACID compliance, strong data integrity
- Better for complex queries and joins
- Smaller storage footprint
- Excellent tooling (pgAdmin, DataGrip)

**Cons**:
- Rigid schema requires upfront design
- Migrations needed for schema changes
- No native file storage (need separate solution for images)
- Vertical scaling more challenging

**Why Rejected**: Rigid schema and lack of native file storage

#### **MySQL**
**Pros**:
- Wide adoption, mature ecosystem
- Good performance for read-heavy workloads
- Strong data integrity

**Cons**:
- Similar schema rigidity to PostgreSQL
- No native file storage
- Less suitable for document-heavy data

**Why Rejected**: Same reasons as PostgreSQL

---

## Decision 2: Microservices vs Monolith

**Date**: September 10, 2025  
**Status**: ✅ Accepted  
**Deciders**: Team Kates (unanimous)

### Context

Course requirements mandate cloud-native architecture demonstrating microservices principles. Team needs to show understanding of distributed systems, service communication, and scalability patterns.

### Decision

**Chosen**: Microservices architecture with 3 main services + 3 workers

**Services**:
1. User Service (authentication, profiles)
2. Wardrobe Service (clothing CRUD, image storage)
3. Outfit Service (generation, weather, AI)

**Workers**:
1. Image Processor (AI analysis)
2. Fashion Advice (LLM responses)
3. Outfit Generator (batch processing)

### Rationale

1. **Course Requirement**
   - Project explicitly requires microservices architecture
   - Demonstrates cloud-native development skills
   - Shows understanding of distributed systems

2. **Independent Scaling**
   - Outfit service (high compute) can scale independently
   - Image processor can handle variable workload
   - Wardrobe service scales with user uploads

3. **Team Parallelization**
   - 3 team members work on separate services
   - Reduces merge conflicts
   - Clear ownership and responsibility

4. **Technology Flexibility**
   - Use Python for AI worker (better ML libraries)
   - Node.js for web services (fast development)
   - Best tool for each job

5. **Fault Isolation**
   - AI service failure doesn't break user authentication
   - Image processing errors don't affect outfit generation
   - Easier to debug and monitor

### Consequences

**Positive**:
- ✅ Meets course requirements fully
- ✅ Team can work in parallel efficiently
- ✅ Independent deployment and scaling
- ✅ Real-world architecture experience

**Negative**:
- ❌ Increased complexity (network calls, debugging)
- ❌ Distributed data consistency challenges
- ❌ More infrastructure overhead (more containers)
- ❌ Inter-service authentication complexity

**Mitigation Strategies**:
- Clear service boundaries (no shared code)
- Comprehensive API documentation
- Centralized logging and monitoring
- Service mesh for advanced scenarios (future)

### Alternatives Considered

#### **Monolith**
**Pros**:
- Simpler architecture (single codebase)
- Easier local development
- Simpler deployment (one container)
- No distributed data issues

**Cons**:
- Doesn't meet course requirements
- Single point of failure
- Can't scale components independently
- Team members block each other

**Why Rejected**: Doesn't meet course requirements, limits learning

#### **Serverless (Lambda Functions)**
**Pros**:
- No infrastructure management
- Pay-per-use pricing
- Auto-scaling

**Cons**:
- Not suitable for homelab deployment
- Cold start latency
- Vendor lock-in (AWS/Azure/GCP)
- Limited by execution time limits

**Why Rejected**: Homelab requirement, cold starts

---

## Decision 3: RabbitMQ vs Kafka

**Date**: September 25, 2025  
**Status**: ✅ Accepted  
**Deciders**: Team Kates (Hanna Saffi proposed, team agreed)

### Context

Need message queue for asynchronous processing:
- Image analysis (3-5 seconds)
- AI fashion advice (5-10 seconds)
- Outfit generation (1-3 seconds)

Without async processing, API responses would be too slow (> 5 seconds), creating poor user experience.

### Decision

**Chosen**: RabbitMQ

### Rationale

1. **Simplicity**
   - Easier to set up and configure
   - Less operational overhead
   - Perfect for request/reply patterns

2. **Message Acknowledgment**
   - Exactly-once delivery semantics
   - Requeue on failure
   - Prevents message loss

3. **Low Latency**
   - Optimized for low-latency messaging
   - Better for our use case (real-time processing)
   - Not streaming large volumes of data

4. **Management UI**
   - Built-in web UI for monitoring
   - Easy to debug and troubleshoot
   - Great for demos and presentations

5. **Mature Ecosystem**
   - Well-documented
   - Strong Node.js client (amqplib)
   - Battle-tested in production

6. **Resource Efficiency**
   - Lighter than Kafka (important for homelab)
   - Lower memory footprint
   - Single instance sufficient for our scale

### Consequences

**Positive**:
- ✅ Easy to set up and maintain
- ✅ Excellent debugging tools (management UI)
- ✅ Low latency for our use cases
- ✅ Reliable message delivery

**Negative**:
- ❌ Lower throughput than Kafka (not an issue for us)
- ❌ No built-in data retention after consumption
- ❌ Harder to scale to millions of messages/sec

**Mitigation Strategies**:
- Monitor queue depth and consumer lag
- Scale workers horizontally if needed
- Use dead letter queues for failed messages

### Alternatives Considered

#### **Apache Kafka**
**Pros**:
- Higher throughput (millions of messages/sec)
- Built-in data retention and replay
- Better for event sourcing
- Strong durability guarantees

**Cons**:
- More complex to set up (ZooKeeper)
- Higher resource usage (JVM)
- Overkill for our message volume
- Steeper learning curve

**Why Rejected**: Too complex for our scale, higher resource usage

#### **Redis Pub/Sub**
**Pros**:
- Extremely fast
- Simple to use
- Already might use Redis for caching

**Cons**:
- Fire-and-forget (no persistence)
- No message acknowledgment
- Messages lost if consumer down
- No built-in retry logic

**Why Rejected**: No persistence or acknowledgment

---

## Decision 4: GridFS vs S3

**Date**: September 20, 2025  
**Status**: ✅ Accepted  
**Deciders**: Team Kates ([Your Name] proposed, team agreed)

### Context

Need to store user-uploaded clothing photos:
- Average size: 1-5 MB per image
- Need thumbnails (300x300, ~100KB)
- Expected volume: 50 images per user
- Must be accessible via API

### Decision

**Chosen**: MongoDB GridFS

### Rationale

1. **No External Dependencies**
   - Everything in MongoDB
   - No AWS/Azure account needed
   - Works in homelab without internet

2. **Transactional Consistency**
   - Image and metadata in same database
   - Atomic operations (all or nothing)
   - Simpler backup and restore

3. **Simpler Architecture**
   - One less service to manage
   - No separate credentials
   - Unified access patterns

4. **Cost**
   - Free (no cloud storage fees)
   - Important for student project
   - No bandwidth charges

5. **Homelab Friendly**
   - Doesn't require external services
   - Works completely offline
   - No vendor lock-in

### Consequences

**Positive**:
- ✅ Simplified architecture (one database)
- ✅ Zero cost for storage
- ✅ Works offline in homelab
- ✅ Unified backup/restore

**Negative**:
- ❌ Increases MongoDB size significantly
- ❌ Slower than S3 for large files
- ❌ No built-in CDN
- ❌ Backup size increases

**Mitigation Strategies**:
- Compress images (JPEG 80% quality)
- Generate small thumbnails (300x300)
- Monitor storage usage
- Implement image retention policy

### Alternatives Considered

#### **AWS S3**
**Pros**:
- Blazing fast with CloudFront CDN
- 99.999999999% durability
- Integrated with AWS ecosystem
- Unlimited scalability

**Cons**:
- Costs money (important for student project)
- Requires AWS account and credentials
- Vendor lock-in
- Doesn't work in homelab without internet
- Need separate backup strategy

**Why Rejected**: Cost, external dependency, homelab requirement

#### **MinIO (Self-hosted S3)**
**Pros**:
- S3-compatible API
- Can deploy in Kubernetes
- Better performance than GridFS
- Object storage best practices

**Cons**:
- Another service to manage
- More complex architecture
- Higher resource usage
- Learning curve

**Why Rejected**: Added complexity, more resources

---

## Decision 5: JWT vs Session Tokens

**Date**: September 18, 2025  
**Status**: ✅ Accepted  
**Deciders**: Team Kates (unanimous)

### Context

Need authentication mechanism for API requests. Must support:
- Stateless services (no shared session store)
- Multiple service instances
- Microservices architecture

### Decision

**Chosen**: JWT (JSON Web Tokens)

### Rationale

1. **Stateless**
   - No server-side session storage needed
   - Services can validate tokens independently
   - Scales horizontally easily

2. **Microservices Friendly**
   - Each service validates tokens without calling user-service
   - No shared session store required
   - Decoupled architecture

3. **Standard**
   - Industry standard (RFC 7519)
   - Well-supported libraries (jsonwebtoken)
   - Familiar to most developers

4. **Self-Contained**
   - Token contains user info (userId, email)
   - No database lookup for every request
   - Reduces latency

5. **Portable**
   - Works across different domains
   - Mobile-friendly
   - API-first approach

### Consequences

**Positive**:
- ✅ True stateless architecture
- ✅ Easy horizontal scaling
- ✅ No session store required
- ✅ Works well with microservices

**Negative**:
- ❌ Can't revoke tokens before expiration
- ❌ Larger payload than session IDs
- ❌ Token refresh complexity
- ❌ Vulnerable if secret leaked

**Mitigation Strategies**:
- Short expiration (7 days)
- Secure secret storage (Kubernetes Secrets)
- HTTPS only
- Implement token blacklist for critical cases

### Alternatives Considered

#### **Session Tokens + Redis**
**Pros**:
- Can revoke immediately
- Smaller token size
- Fine-grained control

**Cons**:
- Requires Redis (shared state)
- Single point of failure
- Adds latency (Redis lookup)
- More complex architecture

**Why Rejected**: Adds dependency, not truly stateless

#### **OAuth 2.0**
**Pros**:
- Industry standard for authorization
- Third-party login (Google, Facebook)
- Fine-grained permissions

**Cons**:
- Overkill for our use case
- More complex to implement
- Requires authorization server
- Unnecessary for single app

**Why Rejected**: Too complex, not needed

---

## Decision 6: Node.js vs Other Runtimes

**Date**: September 12, 2025  
**Status**: ✅ Accepted (with Python for AI worker)  
**Deciders**: Team Kates (unanimous)

### Context

Need to choose runtime for backend services. Team has varying experience levels with different languages.

### Decision

**Chosen**: Node.js for services, Python for AI worker

### Rationale

1. **JavaScript Everywhere**
   - Same language as frontend (React)
   - Reduce context switching
   - Code sharing potential (types, validation)

2. **Async I/O**
   - Perfect for I/O-bound operations
   - Non-blocking API calls
   - Efficient for microservices

3. **npm Ecosystem**
   - Huge package ecosystem
   - Express for REST APIs
   - Mongoose for MongoDB
   - Many useful libraries

4. **Team Experience**
   - All team members know JavaScript
   - Faster development
   - Easier code reviews

5. **Docker Friendly**
   - Small base images (node:18-alpine)
   - Fast container startup
   - Good for Kubernetes

6. **Python for AI**
   - Better ML libraries (transformers, torch)
   - Easier to work with Ollama
   - Natural choice for AI tasks

### Consequences

**Positive**:
- ✅ Unified language (mostly)
- ✅ Fast development
- ✅ Great async support
- ✅ Excellent tooling

**Negative**:
- ❌ Single-threaded (use clustering for CPU tasks)
- ❌ Callback hell (mitigated with async/await)
- ❌ Dynamic typing (can use TypeScript)
- ❌ Python for AI adds language diversity

**Mitigation Strategies**:
- Use async/await consistently
- Consider TypeScript for larger services
- Use clustering for CPU-bound tasks
- Clear separation between Node.js and Python services

### Alternatives Considered

#### **Go**
**Pros**:
- Excellent performance
- Built-in concurrency
- Small binary size
- Strong typing

**Cons**:
- Team less familiar
- Smaller ecosystem than Node.js
- More verbose code
- Steeper learning curve

**Why Rejected**: Team unfamiliarity, time constraints

#### **Python (for all services)**
**Pros**:
- Great for AI/ML
- Simple syntax
- Good web frameworks (FastAPI, Flask)

**Cons**:
- Slower than Node.js
- GIL limits concurrency
- Larger Docker images
- Not best for high-throughput APIs

**Why Rejected**: Performance concerns for API services

---

## Decision 7: Ollama vs OpenAI

**Date**: October 5, 2025  
**Status**: ✅ Accepted  
**Deciders**: Team Kates (Hanna Saffi proposed)

### Context

Need AI-powered fashion advice feature. Options include:
- Local LLM (Ollama)
- Cloud APIs (OpenAI, Google Gemini, Anthropic)

### Decision

**Chosen**: Ollama (llama3.2) as primary, with fallback to cloud APIs

### Rationale

1. **Cost**
   - Ollama is completely free
   - Critical for student project
   - No API usage limits

2. **Privacy**
   - User data stays local
   - No data sent to third parties
   - GDPR compliance easier

3. **Latency**
   - Local processing faster than API calls
   - No network latency
   - More predictable performance

4. **Learning Opportunity**
   - Experience deploying local ML models
   - Understanding LLM deployment
   - Real-world ML ops

5. **Reliability**
   - No dependency on external services
   - Works offline in homelab
   - No API rate limits

6. **Fallback Strategy**
   - Can fall back to Google Gemini if needed
   - Or OpenAI as last resort
   - Ensures feature always works

### Consequences

**Positive**:
- ✅ Zero cost for unlimited requests
- ✅ Complete data privacy
- ✅ Works offline
- ✅ Great learning experience

**Negative**:
- ❌ Lower quality than GPT-4
- ❌ Requires significant CPU/RAM
- ❌ Slower than cloud APIs for complex queries
- ❌ Need to manage model updates

**Mitigation Strategies**:
- Implement fallback to cloud APIs
- Use smaller model (llama3.2-3b)
- Limit response length
- Cache common responses

### Alternatives Considered

#### **OpenAI GPT-4**
**Pros**:
- Highest quality responses
- Most capable model
- Simple API
- Regular updates

**Cons**:
- Expensive ($0.03 per 1K tokens)
- Requires payment method
- Data sent to OpenAI
- Rate limits

**Why Rejected**: Cost prohibitive for student project

#### **Google Gemini**
**Pros**:
- Free tier available
- Good quality
- Fast responses
- Multimodal capabilities

**Cons**:
- Rate limited
- Data sent to Google
- Requires API key
- May change pricing

**Why Rejected**: External dependency, but kept as fallback

---

## Decision 8: REST vs GraphQL

**Date**: September 16, 2025  
**Status**: ✅ Accepted  
**Deciders**: Team Kates (unanimous)

### Context

Need to design API for frontend-backend communication. Must support:
- User authentication
- Clothing CRUD operations
- Outfit generation
- Image uploads

### Decision

**Chosen**: RESTful APIs

### Rationale

1. **Simplicity**
   - Easier to learn and implement
   - Standard HTTP methods (GET, POST, PUT, DELETE)
   - Clear conventions

2. **Course Alignment**
   - Course examples use REST
   - Professor familiar with REST
   - Industry standard

3. **Tooling**
   - Excellent tools (Postman, curl)
   - Swagger/OpenAPI for documentation
   - Easy to debug with browser dev tools

4. **Caching**
   - HTTP caching works out of the box
   - CDN support
   - Browser caching

5. **Team Familiarity**
   - All team members know REST
   - Faster development
   - Less training needed

### Consequences

**Positive**:
- ✅ Simple to understand and implement
- ✅ Great tooling ecosystem
- ✅ HTTP caching support
- ✅ Clear API contracts

**Negative**:
- ❌ Over-fetching (get more data than needed)
- ❌ Under-fetching (multiple requests needed)
- ❌ Version management needed
- ❌ Less flexible than GraphQL

**Mitigation Strategies**:
- Design lean endpoints
- Use query parameters for filtering
- Consider GraphQL for v2 if needed

### Alternatives Considered

#### **GraphQL**
**Pros**:
- Flexible queries (get exactly what you need)
- Single endpoint
- Strong typing
- No over/under-fetching

**Cons**:
- Steeper learning curve
- More complex implementation
- Caching more difficult
- Debugging harder

**Why Rejected**: Team unfamiliarity, time constraints

#### **gRPC**
**Pros**:
- High performance
- Strong typing (Protocol Buffers)
- Bi-directional streaming
- Efficient serialization

**Cons**:
- Not browser-friendly
- Harder to debug
- Requires code generation
- Overkill for our use case

**Why Rejected**: Not suitable for web APIs

---

## Decision 9: React vs Other Frameworks

**Date**: September 22, 2025  
**Status**: ✅ Accepted  
**Deciders**: Team Kates (Kuany Kuany proposed)

### Context

Need frontend framework for building user interface. Requirements:
- Component-based architecture
- State management
- Routing
- API integration

### Decision

**Chosen**: React 18 with Vite

### Rationale

1. **Industry Standard**
   - Most popular frontend framework
   - Huge community
   - Abundant learning resources

2. **Component Model**
   - Reusable components
   - Clear separation of concerns
   - Easy to maintain

3. **Ecosystem**
   - Vast library ecosystem
   - React Router for navigation
   - Many UI libraries (Material-UI, Tailwind)

4. **Team Experience**
   - Team familiar with React
   - Faster development
   - Good course coverage

5. **Vite**
   - Lightning-fast dev server
   - Instant HMR (Hot Module Replacement)
   - Optimized builds
   - Better DX than Create React App

6. **Job Market**
   - React skills highly valued
   - Great for portfolios
   - Industry relevance

### Consequences

**Positive**:
- ✅ Fast development with Vite
- ✅ Great developer experience
- ✅ Huge ecosystem
- ✅ Team familiarity

**Negative**:
- ❌ Large bundle size (mitigated with code splitting)
- ❌ Virtual DOM overhead (minimal for our scale)
- ❌ Learning curve for advanced patterns
- ❌ Need additional libraries (router, state)

**Mitigation Strategies**:
- Use code splitting
- Optimize bundle with tree shaking
- Use Context API for simple state management
- Consider Redux only if needed

### Alternatives Considered

#### **Vue.js**
**Pros**:
- Easier learning curve
- Excellent documentation
- Smaller bundle size
- Great for small to medium apps

**Cons**:
- Smaller ecosystem than React
- Less popular in job market
- Team less familiar

**Why Rejected**: Team has more React experience

#### **Angular**
**Pros**:
- Full-featured framework
- TypeScript by default
- Strong opinions (less decision fatigue)
- Good for large apps

**Cons**:
- Steeper learning curve
- Heavier than React
- More complex
- Overkill for our project

**Why Rejected**: Too complex, team unfamiliarity

---

## Decision 10: Kubernetes vs Docker Swarm

**Date**: September 8, 2025  
**Status**: ✅ Accepted  
**Deciders**: Team Kates (unanimous), Course Requirement

### Context

Course requires container orchestration for deployment. Need to choose platform that:
- Runs on homelab cluster
- Supports multiple containers
- Provides service discovery
- Handles auto-scaling

### Decision

**Chosen**: Kubernetes

### Rationale

1. **Course Requirement**
   - Professor provides Kubernetes cluster
   - Course material covers Kubernetes
   - Industry standard for learning

2. **Industry Standard**
   - De facto orchestration platform
   - Valuable resume skill
   - Used by majority of companies

3. **Features**
   - Auto-scaling (HPA, VPA)
   - Self-healing
   - Rolling updates
   - ConfigMaps and Secrets
   - StatefulSets for databases

4. **Ecosystem**
   - Helm for package management
   - Extensive third-party tools
   - Strong community
   - Cloud provider support

5. **Learning Value**
   - Most important skill to learn
   - Complex but worth it
   - Real-world experience

### Consequences

**Positive**:
- ✅ Industry-standard skill
- ✅ Powerful features
- ✅ Excellent for portfolios
- ✅ Course support

**Negative**:
- ❌ Complex to learn
- ❌ Steep learning curve
- ❌ YAML configuration heavy
- ❌ Resource overhead

**Mitigation Strategies**:
- Use professor-provided cluster
- Start with simple configurations
- Learn incrementally
- Leverage extensive documentation

### Alternatives Considered

#### **Docker Swarm**
**Pros**:
- Simpler than Kubernetes
- Built into Docker
- Easier to learn
- Lower resource usage

**Cons**:
- Doesn't meet course requirements
- Less industry adoption
- Fewer features
- Smaller ecosystem

**Why Rejected**: Doesn't meet course requirements

#### **Docker Compose (No Orchestration)**
**Pros**:
- Simplest option
- Great for local development
- Easy to understand
- Minimal overhead

**Cons**:
- Not production-ready
- No auto-scaling
- No self-healing
- Single host only

**Why Rejected**: Doesn't meet project requirements

---

## Summary of Key Decisions

| Decision | Chosen | Primary Reason |
|----------|--------|----------------|
| Database | MongoDB | Flexible schema, GridFS |
| Architecture | Microservices | Course requirement, scalability |
| Message Queue | RabbitMQ | Simplicity, low latency |
| Image Storage | GridFS | No external dependencies |
| Authentication | JWT | Stateless, microservices-friendly |
| Backend Runtime | Node.js | Team experience, async I/O |
| AI Provider | Ollama | Free, privacy, learning |
| API Style | REST | Simplicity, tooling |
| Frontend | React + Vite | Industry standard, team experience |
| Orchestration | Kubernetes | Course requirement, industry standard |

---

## Lessons Learned

### **What Went Well**

1. **Early Technology Decisions**
   - Made key decisions in first 2 weeks
   - Avoided analysis paralysis
   - Could iterate on implementations

2. **Proof of Concepts**
   - Built small POCs before committing
   - Validated assumptions early
   - Caught issues before deep implementation

3. **Team Alignment**
   - Regular discussions on trade-offs
   - Documented decisions
   - Everyone understood rationale

### **What Could Be Improved**

1. **Microservices Complexity**
   - Underestimated debugging difficulty
   - Should have started with monolith, split later
   - More comprehensive integration tests needed

2. **GridFS Performance**
   - Didn't consider query performance impact
   - Should have benchmarked earlier
   - Thumbnails helped but not perfect

3. **Testing Strategy**
   - Should have defined test strategy earlier
   - Retrofit testing was harder
   - CI/CD would have caught issues earlier

### **Future Recommendations**

1. **Start Simpler**
   - Build monolith first
   - Split into microservices when boundaries clear
   - Refactor is easier than designing perfect system

2. **Load Testing**
   - Test at scale early
   - Identify bottlenecks before production
   - Make data-driven decisions

3. **Observability First**
   - Add logging/monitoring from day one
   - Debugging distributed systems is hard
   - Invest in good tooling early

---

## Decision Review Schedule

- **Quarterly Review**: Re-evaluate decisions based on metrics
- **Post-Project Review**: Comprehensive analysis after December 2
- **Continuous**: Update this document as decisions evolve

---

**Document Maintainer**: Team Kates  
**Last Review**: November 25, 2025  
**Next Review**: December 3, 2025 (post-presentation)