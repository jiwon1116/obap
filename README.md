# **GudiMwoMeokJi**

> “Find the best lunch spots around your office.”

GudiMwoMeokJi is an MVP project designed for **office workers in the Gudi area** to easily discover nearby restaurants, leave verified reviews, and connect with coworkers through company-based chat rooms.

This project is built using a **Spec-Driven Development (SDD)** approach —

every feature begins with clear specifications and acceptance criteria before implementation.

---

## **Core MVP Features**

### **Restaurant Map**

- Displays restaurants within **1–2 km** of the company address
- Category filters (Korean / Chinese / Japanese / Café)
- Distance sorting (“5-min / 10-min walk”)
- Restaurant detail view (photo, address, rating, review summary)

---

### **Company Verification Login**

- Email-based verification using company domain (e.g., `@strap.build`)
- Unlocks **employee-only features** after verification
- Guests (non-employees) can only browse restaurants

---

### **Review System**

- Write reviews on restaurant detail pages
- Upload photos, add star ratings, and leave comments
- Sort reviews by latest or most popular
- Edit or delete your own reviews

---

### **Nearby Restaurant List**

- **List Display:** Shows restaurants within a certain radius based on the company location
- **Sort Options:**
  - **Newest** – Recently added restaurants
  - **Price (Low → High)** – Sorted by meal price in ascending order
  - **Distance (Nearest First)** – Sorted by proximity to the company
- **Filter Options:**
  - **By Cuisine:** Korean / Chinese / Japanese / Café
  - **By Price Range:** Under ₩8,000 / Around ₩10,000 / Premium Lunch

---

### **Community (Lite Version)**

- Company-based group chatrooms
- Create team chatrooms and exchange messages
- _(No image or emoji support in MVP)_

---

## **Tech Stack**

### **1) Frontend**

- **Framework**: Next.js 15 (App Router) + TypeScript
  - _Reason_: Excellent SEO support (for “Newly Opened Restaurants”), file-based routing, and simplified server actions for forms and uploads
- **UI**: Tailwind CSS + shadcn/ui
  - Rapid MVP development with consistent components
- **State Management**: TanStack Query (server state) + Redux Toolkit (client/global UI state)
- **Map**: Naver Maps JS SDK
  - Optimized for walking distance and local coverage in Korean regions (e.g., Guro Digital Complex)
- **Form & Validation**: react-hook-form + zod
- **Icons**: lucide-react
- **Language**: Fixed to `ko-KR` (i18n planned for Phase 2)

---

### **2) Backend – Supabase**

- **Database**: Postgres (+ PostGIS for geospatial queries)
  - Radius search: `ST_DWithin`
  - Distance calculation: `ceil(ST_Distance(...) / 72)` (1.2 m/s ≈ 72 m/min walking speed)
- **Authentication**: Email Magic Link + Domain Whitelist (`@strap.build`)
  - Employee-only features unlocked when `role='employee'` or `email LIKE '%@strap.build'`
  - Auto-creates `profiles` entry on signup via trigger
- **Storage**:
  - Public bucket: `public/restaurants`
  - Private bucket: `private/reviews` → accessed via Signed URLs
- **Realtime**:
  - Used for company/team chat (`chat_messages` table subscriptions)
- **Edge Functions (Node.js or Deno)**:
  - Post-auth hook to assign `employee` role
  - Review moderation/reporting workflows
  - Map cache refresh for “newly opened” restaurants (within 90 days)
- **Security**:
  - **Row-Level Security (RLS)** on all tables
  - Granular policies by user role and company
  - Private buckets protected with **Signed URLs**
  - `Service Role Key` strictly server-side only (never exposed to client)
- **Performance**:
  - Indexes: `restaurants(GIST geom)`, `(avg_rating, review_count)`
  - Query results limited to 2km radius with pagination

---

### **3) Admin (BackOffice) – Refine + Ant Design**

- **Framework**: Refine (React-based headless Admin) + Ant Design UI
- **Auth**: Supabase JWT + Role-based Access (`admin` / `employee`)
- **Resources**:
  - Restaurants: CRUD, map preview, categories, open date, price tier
  - Reviews: Moderation (reported/hidden), filters
  - Profiles: Manage user roles (`guest ↔ employee`)
  - Chat Rooms: Manage members and messages
- **Utilities**:
  - CSV Import/Export for restaurant data
  - Manual trigger to refresh “Newly Opened” restaurant cache
- **UI Layout**:
  - `<Refine>` root with AntD `<Layout>` shell
  - DataProvider connected to Supabase SDK
  - i18n-ready structure for admin labels

---

## **Project Structure**

```
gudimwomeokji/
├── apps/
│   ├── web/        # Frontend (Next.js)
│   └── admin/      # Admin (Refine + Ant Design)
├── packages/
│   ├── types/      # Shared DTOs and zod schemas
│   └── config/     # Shared ESLint, Prettier, tsconfig
└── infra/
    └── supabase/   # SQL migrations, policies, seeds, RLS rules

```

---

## **Development Principles**

1. **Spec First** – Every feature starts with a written spec and acceptance criteria.
2. **Lean MVP** – Only implement core features per milestone.
3. **Single Source of Truth** – Shared schemas and DTOs stored in `packages/types`.
4. **Testing as Spec** – Tests reference AC IDs directly.
5. **Consistent Branching** – Maintain strict Git hygiene and short-lived branches.

---

## **Git Branching Strategy**

- **Main Branch:** `main`
- **Feature Branch:** `feat/<scope>-<short>` → e.g., `feat/auth-login`
- **Fix Branch:** `fix/<scope>-<short>`
- **Merge Rule:** Squash merge after CI passes
- **Commit Format:** Conventional Commits (`feat`, `fix`, `chore`, `refactor`, etc.)
- **Version Tags:** `mvp-0.1.0`, `mvp-0.2.0`, etc.

---

## **Development Workflow**

1. Write spec & AC → save in `docs/specs/`
2. Define DTOs & schema → update `packages/types` and Supabase schema
3. Create branch (`feat/<feature>`)
4. Implement feature + write tests
5. Run `npm run lint` & `npm run typecheck`
6. Open PR → review → merge after CI passes
7. Update changelog (`docs/changelog.md`)

---

## **Quick Start**

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/gudimwomeokji.git

# 2. Install dependencies
npm install

# 3. Run the development server
npm run dev:web      # frontend (Next.js)
npm run dev:admin    # admin panel (Refine)

# 4. Lint & typecheck before commits
npm run lint
npm run typecheck

```

---

## **MVP Goals**

- **Timeline:** 3–4 weeks
- **Target Audience:** Office workers in the Gudi area (starting with Strapbuild team)
- **Success Metrics:**
  - 50+ restaurants listed
  - 20+ verified company users
  - 30+ reviews posted

---

## **Philosophy**

> “Clear specs, consistent code, repeatable delivery.”

All contributors must adhere to the conventions, contexts, and technical requirements defined in this project to ensure maintainable, scalable, and high-quality delivery.
