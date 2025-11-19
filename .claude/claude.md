@technical-requirements/09-documentation/documentation-policy.md

@technical-requirements/10-principles/principles.md

Use Context7 as the default research agent for code, setup/config, planning, bug

fixes, and API/library docs. Auto resolve library IDs and fetch docs via

Context7 MCP. For research, split into independent sub tasks separate from

planning.

# Project O!BAP

## **Conventions**

If conventions are required for your task, refer to and follow the relevant files below:

- `@conventions/convention-general.md`
- When writing or modifying test code: `conventions/convention-test-code.md`
- For React (Next.js) refactoring: `conventions/convention-react-refactor.md`
- For API-level end-to-end testing: `conventions/api-level-e2e-test-convention.md`
- For OpenAPI or AsyncAPI work:
  - `conventions/openapi-convention.md`
  - `conventions/asyncapi-websocket-specification-convention.md`
- For database schema work (Supabase Postgres):
  - `conventions/convention-prisma-schema.md`
  - `conventions/prisma.md`

---

## **Contexts**

- General: `@context/general-context.md`
- Agent behavior rules: `@agent-rules/behaviour.md`
- Code generation quick reference: `contexts/code-generation-quick-reference.md`
- **Deployment Overview (Supabase + Vercel)**: `contexts/deployment-overview.md`
- SDK generation overview: `contexts/sdk-generation-overview.md`
- Project overview (milestones, SDD workflow): `contexts/project-overview.md`
- BackOffice context (**Refine + Ant Design**): `contexts/backoffice-context.md`
- Mobile development context: `contexts/mobile-context.md`
- Domain model design context: `contexts/domain-model-context.md`

---

## **Technical Requirements**

All technical requirements are defined under:

`/technical-requirements/`

### Includes:

- **Frontend**: Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui, Naver Map SDK)
- **Backend**: Supabase (Postgres + PostGIS + Auth + Realtime + Storage + Edge Functions)
- **Admin**: Refine + Ant Design
- **Auth**: Supabase Email Magic Link + Domain Whitelist (`@strap.build`)
- **Realtime**: Supabase Realtime for company/team chat
- **Storage**: Supabase Storage (public/private buckets with Signed URLs)
- **Validation**: react-hook-form + zod (shared schemas)
- **State Management**: TanStack Query + Redux Toolkit
- **Infrastructure**:
  - **Vercel** – Frontend (Next.js) & Admin (Refine)
  - **Supabase** – Database, Auth, Realtime, Storage
  - **AWS Lambda** – Optional Node.js serverless functions

---

## **Git Branching Strategy**

- **Model**: Trunk-Based Development
- **Default Branch**: `main`
- **Feature Branch**: `feat/<scope>-<short>` → e.g. `feat/auth-login`
- **Fix Branch**: `fix/<scope>-<short>`
- **Merge Rule**: Squash merge after CI passes
- **Commit Format**: Conventional Commits (`feat`, `fix`, `chore`, `refactor`, etc.)
- **Version Tags**: `mvp-0.1.0`, `mvp-0.2.0`, etc.

---

## **Principles**

1. **Spec First** – Every feature begins with a written spec and acceptance criteria (AC).
2. **Lean MVP** – Focus on essential features for each milestone.
3. **Single Source of Truth** – All DTOs and schemas live in `packages/types`.
4. **Testing as Spec** – Tests must directly reference acceptance criteria IDs.
5. **Consistent Branching** – Short-lived feature branches with clean, squash merges.

---

## **Documentation & File Placement**

- Default documentation directory: `docs/`
- Each module must include its own `README.md`.
- Versioned specs and changelogs must be recorded per milestone (`docs/changelog.md`).
- All documentation updates must align with the current version tag.
- Admin, frontend, and infra modules can maintain their own `/docs` directories.

## Core Philosophy

- “Clear specs, consistent code, repeatable delivery.”
- All contributors must follow the conventions, contexts, and technical requirements listed above.

## etc

- If the location for creating the document isn't explicitly specified, you should create the document in this directory by default: `docs/`

- All tasks must end with successfully running both `npm run lint` and `npm run typecheck`. If these checks fail, need to fix the errors found.
