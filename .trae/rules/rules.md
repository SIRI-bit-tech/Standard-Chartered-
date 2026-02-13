---
trigger: always_on
---

Project Architecture & Code Quality
Maximum File Length: No file shall exceed 200 lines. Split into smaller, reusable components/modules and this is for frontend only not backend.
Reusability First: Always create small, single-purpose, reusable components and functions instead of monolithic code.
Component Standards:

React: Functional components only (no class components)
One component per file, maximum 200 lines only in frontend.
Extract logic into custom hooks when complexity grows
Use constants.ts for all configuration values
Use global.d.ts for all shared TypeScript types

Code Organization:

Frontend: PascalCase for components (AccountCard.tsx), camelCase for hooks (useAuth.ts), kebab-case for utilities (api-client.ts)
Backend: snake_case for files (auth_service.py), PascalCase for classes (UserService), snake_case for functions (get_user_by_id)
Constants: SCREAMING_SNAKE_CASE (API_BASE_URL, MAX_FILE_SIZE)

Technology Stack Compliance:

Backend: Python FastAPI with async/await, SQLAlchemy ORM, PostgreSQL
Frontend: Next.js 16 App Router, TypeScript, React functional components
Real-time: Ably (NOT Socket.io)
Authentication: Better Auth or Clerk (NOT Keycloak)
Cache: Redis
File Storage: Cloudinary
Email: SendGrid

Security Requirements:

Encrypt sensitive data at rest (AES-256): email, phone, account numbers
TLS 1.3 for data in transit
JWT authentication with 15-minute access tokens
Session timeout after 15 minutes of inactivity
Rate limiting on all endpoints
Comprehensive input validation (Pydantic backend, Zod frontend)
Audit logging for all state-changing operations

Banking-Specific Standards:

Account numbers: Generate based on country (8-14 digits, stored as String to preserve leading zeros)
Multi-currency support: Assign primary currency based on user's country during registration
Transaction limits: Enforce daily limits based on user tier (Standard/Priority/Premium)
Real-time notifications: Use Ably for balance updates, transaction alerts, transfer status
Compliance: KYC/AML verification required, 7-year data retention for financial records

Error Handling:

Comprehensive error handling at all layers
User-friendly error messages
Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
Loading states for all async operations
Graceful degradation for failed real-time connections

Never Do:

Write files exceeding 200 lines in frontend.
Repeat code (use DRY principle)
Use class components in React
Hardcode values (use constants)
Skip error handling or loading states
Store sensitive data unencrypted
Use Socket.io (use Ably)
Use Keycloak (use Better Auth or Clerk)


