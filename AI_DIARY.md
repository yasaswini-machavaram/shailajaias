# 📓 AI Engineering Diary — Shailaja IAS Project

> **INSTRUCTION FOR AI (READ FIRST, EVERY SESSION):**
> This file is your memory. Before writing a single line of code or asking any question,
> read this entire file top-to-bottom. It tells you what this project is, what is built,
> what is pending, what patterns to follow, and what decisions were made and why.
> After every meaningful session, **update the changelog at the bottom**.

---

## 🎯 PROJECT OVERVIEW

**Shailaja IAS** is a **UPSC (IAS exam) preparation platform** built as a mobile-first web app.
It has two distinct portals:

1. **Student Portal** (`apps/client`, runs on `:3000`) — The public-facing mobile app for UPSC aspirants
2. **Admin Portal** (`apps/client/app/admin`, same Next.js app at `/admin`) — A CMS for admin/teachers to publish content
3. **Backend API** (`apps/api`, runs on `:4000`) — Express.js REST API with MongoDB

---

## 🏗️ MONOREPO STRUCTURE

```
shailaja-ias/                    ← Turborepo root (pnpm workspaces)
├── apps/
│   ├── api/                     ← Express + MongoDB backend (Port 4000)
│   ├── client/                  ← Next.js 14 frontend (Port 3000)
│   ├── web/                     ← Turborepo stub (unused, kept for structure)
│   └── docs/                    ← Turborepo stub (unused, kept for structure)
├── packages/
│   ├── types/                   ← Shared TypeScript types (@repo/types)
│   ├── ui/                      ← Shared UI stubs (minimal, mostly unused)
│   ├── eslint-config/           ← Shared ESLint config
│   └── typescript-config/       ← Shared tsconfig
├── .agent/workflows/            ← AI agent workflow guides
│   └── apply_style.md           ← How to apply the design system
├── .cursorrules                 ← Tells AI to always check style.json first
├── turbo.json                   ← Turborepo pipeline config
└── pnpm-workspace.yaml          ← Workspace definition
```

**Key Commands:**
```bash
pnpm run nuke      # Kill ports 3000/3001/4000, then start dev servers
pnpm run dev:all   # Start all apps via Turborepo (api + client)
```

---

## 🖥️ BACKEND (apps/api)

### Tech Stack
- **Runtime:** Node.js + TypeScript (ESM modules)
- **Framework:** Express.js 4.x
- **Database:** MongoDB via Mongoose 9.x
- **Auth:** JWT (jsonwebtoken, 30d expiry), bcryptjs for password hashing
- **File Storage:** AWS S3 (images/PDFs) + local `/uploads` directory (for magazines/burning issues)
- **Port:** 4000

### Environment Variables (apps/api/.env)
```
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/shailaja-ias   ← Change to Atlas URI for production
JWT_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
AWS_REGION=ap-south-1
```
> ⚠️ MONGO_URI may have been updated to MongoDB Atlas in a prior session — always verify .env before assuming local DB.

### API Entry Point (apps/api/src/index.ts)
- CORS: allows `localhost:3000`, `localhost:3001`, `127.0.0.1:3000`, `127.0.0.1:3001`, and `process.env.CLIENT_URL`
- JSON body limit: 50mb
- Serves `/uploads` folder as static files
- Health check endpoint: `GET /health`

### Data Models

#### 1. User (`models/User.ts`)
```
email (unique, lowercase), password (hashed, hidden by default), name, role ('admin'|'student')
```
- Pre-save hook hashes password via bcrypt (10 salt rounds)
- `comparePassword()` instance method for login check

#### 2. Article (`models/Article.ts`)
```
type: 'daily_prelims' | 'mains' | 'burning_issue'
title, date (indexed), tags[], content (TipTap JSON string), source?, keywords[], imageUrl?, order, createdBy
```
- Compound index: `date DESC + type`
- Text index on title, content, tags (for search)

#### 3. BurningIssue (`models/BurningIssue.ts`)
```
topic, images[{url, originalName, order}], date (indexed)
```
- Images stored locally in `/uploads`, served via static middleware
- Minimum 1 image required via validator

#### 4. Magazine (`models/Magazine.ts`)
```
title, pdfUrl, pdfKey, category ('prelims_monthly'|'mains_monthly'|'mcq_monthly'|'quarterly'), year (indexed), month, isPublished
```
- MongoDB model name is `'MagazinePdf'` (not 'Magazine') — important for queries
- PDFs stored locally in `/uploads`, served as static files

#### 5. Quiz (`models/Quiz.ts`)
```
date (indexed), title, setName?, questions[{question, options[4], correctIndex (0-3), explanation, subject?}], tags[], createdBy
```
- Minimum 1 question required
- Excel import supported (columns: Question, Option A-D, Correct Answer A/B/C/D, Explanation, Subject)

#### 6. CourseNode (`models/Course.ts`)
```
title, description?, parent (self-ref ObjectId), order, level ('course'|'subject'|'topic'|'subtopic')
contentTabs[{type: 'video'|'notes'|'test', title, videoUrl?, pdfUrl?, pdfKey?, testId?}]
isPublished (default false), createdBy
```
- Tree structure via self-referencing `parent` field
- `testId` references Quiz model

### API Routes Summary

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | Public | Register user |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Private | Get current user |
| GET | `/api/articles` | Public | List articles (filter: type, date, page, limit) |
| GET | `/api/articles/by-date` | Public | Articles by exact date + type |
| GET | `/api/articles/adjacent-dates` | Public | Prev/next date with articles |
| GET | `/api/articles/by-type/:type` | Public | Articles by type |
| GET | `/api/articles/tags` | Public | Distinct tags |
| GET | `/api/articles/:id` | Public | Single article |
| POST | `/api/articles` | Admin | Create article |
| PUT | `/api/articles/:id` | Admin | Update article |
| DELETE | `/api/articles/:id` | Admin | Delete article |
| GET | `/api/burning-issues` | Public | List burning issues |
| GET | `/api/burning-issues/:id` | Public | Single burning issue |
| POST | `/api/burning-issues` | Admin | Create (multipart, up to 20 images) |
| PUT | `/api/burning-issues/:id` | Admin | Update |
| DELETE | `/api/burning-issues/:id` | Admin | Delete |
| GET | `/api/magazines` | Public | List magazines |
| GET | `/api/magazines/admin` | Admin | Admin list (includes unpublished) |
| GET | `/api/magazines/download/:id` | Public | Download PDF with Content-Disposition: attachment |
| GET | `/api/magazines/:id` | Public | Single magazine |
| POST | `/api/magazines` | Admin | Upload PDF + create |
| PUT | `/api/magazines/:id` | Admin | Update |
| DELETE | `/api/magazines/:id` | Admin | Delete |
| GET | `/api/quizzes` | Public | List quizzes |
| GET | `/api/quizzes/adjacent-dates` | Public | Prev/next quiz dates |
| GET | `/api/quizzes/:id` | Public | Single quiz with questions |
| POST | `/api/quizzes` | Admin | Create quiz |
| POST | `/api/quizzes/import-excel` | Admin | Import from Excel |
| PUT | `/api/quizzes/:id` | Admin | Update |
| DELETE | `/api/quizzes/:id` | Admin | Delete |
| GET | `/api/courses` | Public | Root-level courses (tree) |
| GET | `/api/courses/:id` | Public | Course node + children |
| POST | `/api/courses` | Admin | Create node |
| PUT | `/api/courses/:id` | Admin | Update node |
| DELETE | `/api/courses/:id` | Admin | Delete node + children |
| POST | `/api/upload/image` | Admin | Upload image to S3 |
| POST | `/api/upload/pdf` | Admin | Upload PDF to S3 |
| GET | `/api/upload/presigned` | Admin | Presigned S3 URL |
| GET | `/api/search/index` | Public | Lightweight search index for client-side Trie + Inverted Index (ETag + 5-min server cache) |
| GET | `/api/search` | Public | Unified search — legacy fallback (articles + quizzes) |

### Auth Middleware
- `protect`: Verifies Bearer JWT, attaches `req.user`
- `adminOnly`: Checks `req.user.role === 'admin'`
- JWT payload: `{ id, email, role }`, 7d expiry in middleware (30d in controller — inconsistency, use 30d)

### Services
- `s3.service.ts`: `uploadToS3`, `getPresignedUrl`, `deleteFromS3`
- `excel.service.ts`: `parseQuizExcel` — parses `.xlsx`/`.xls` files into quiz question arrays

### File Upload Strategy
- **Burning Issues images:** Local disk storage via multer (`/uploads/burning-issue-{uuid}.{ext}`)
- **Magazine PDFs:** Local disk storage via multer (`/uploads/magazine-{uuid}.{ext}`)
- **Article images / generic:** AWS S3 via `upload.controller.ts`
- Local uploads served as: `http://localhost:4000/uploads/{filename}`

---

## 📱 FRONTEND (apps/client)

### Tech Stack
- **Framework:** Next.js 14.1.0, React 18.2.0
- **Styling:** TailwindCSS 3 + custom CSS variables in `globals.css`
- **Rich Text:** TipTap (for admin editor) + custom `RichTextRenderer` (for student display)
- **PDF Viewing:** react-pdf 7.x
- **Fonts:** Inter (body) + Playfair Display (headlines) from Google Fonts
- **Port:** 3000

### ⚠️ CRITICAL DESIGN RULE
> **ALWAYS read `apps/client/app/style.json` before implementing any UI.**
> The `.cursorrules` file mandates this. Every session, check the style guide first.

### Design System (style.json at `apps/client/app/style.json`)
```
Colors:
  Primary: #1E3A5F (Deep Navy), #D97706 (Refined Orange), #FAFAF8 (Off-White)
  Secondary: #64748B (Warm Gray), #94A3B8 (Light Gray), #E5E7EB (Border Gray)
  Semantic: success #0D9488, error #DC2626, warning #F59E0B, info #4338CA

Typography:
  Headlines: Playfair Display, serif | Body: Inter, system-ui
  H1: 24px/700 | H2: 20px/700 | H3: 18px/600 | H4: 16px/600

Spacing (4px base): xs=4, sm=8, md=12, lg=16, xl=20, 2xl=24, 3xl=32, 4xl=48

Border Radius: sm=4, md=8, lg=12, xl=16, 2xl=20, full=9999

Primary Button: bg #1E3A5F, 44px height, radius 12px, hover #152C4A
Card: bg white, radius 16px, shadow "0 1px 3px rgba(0,0,0,0.05)"
Input: 48px height, border #E5E7EB, focus border 2px #1E3A5F, radius 12px

Layout: Mobile frame 375px, content 343px, side padding 16px
Breakpoints: mobile <640px, tablet 640-1024px, desktop >1024px
```

### App Router Structure (apps/client/app/)
```
/                        → Home page (page.tsx) — Student portal
/daily-prelims           → Daily Prelims articles
/daily-mains             → Daily Mains articles
/daily-quiz              → Daily Quiz
/magazines               → Magazines listing + PDF reader
/magazines/reader        → PDF reader view
/burning-issues          → Burning Issues gallery
/topics                  → Course/topic browser
/search                  → Global search
/admin                   → Admin dashboard (requires login)
/admin/login             → Admin login
/admin/articles          → Article CRUD
/admin/articles/new      → Create article (TipTap editor)
/admin/articles/[id]     → Edit article
/admin/burning-issues    → Burning Issues CRUD
/admin/burning-issues/new→ Create burning issue (image upload)
/admin/magazines         → Magazine CRUD (PDF upload, 21KB page)
/admin/quizzes           → Quiz CRUD
/admin/quizzes/new       → Create quiz
/admin/quizzes/import    → Import from Excel
/admin/courses           → Course tree manager
```

### Key Components

#### Student Portal Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `BottomNav` | `components/BottomNav.tsx` | Mobile bottom nav (hidden on /admin) |
| `DatePicker` | `components/DatePicker.tsx` | Prev/Next day date selector for articles/quiz |
| `QuizOption` | `components/QuizOption.tsx` | Individual quiz answer option with states |
| `RichTextRenderer` | `components/RichTextRenderer.tsx` | Renders TipTap JSON to styled HTML |
| `TagChips` | `components/TagChips.tsx` | Tag display component (links to `/search?tag=`) |
| `BurningIssuesGallery` | `src/components/BurningIssuesGallery.tsx` | Image carousel for burning issues |
| `Header` | `src/components/Header.tsx` | Page header |
| `SearchBar` | `src/components/SearchBar.tsx` | Search input |
| `MagazineCard` | `src/components/MagazineCard.tsx` | Magazine display card |
| `QuickAccessCard` | `src/components/QuickAccessCard.tsx` | Home page quick access card |

#### Client-Side Search Libraries
| File | Location | Purpose |
|------|----------|---------|
| `SearchEngine` | `lib/search-engine.ts` | Trie (prefix tree) + Inverted Index for in-browser search |
| `SearchCache` | `lib/search-cache.ts` | sessionStorage cache manager for the search index |
| `useSearchEngine` | `hooks/useSearchEngine.ts` | React hook providing ready-to-use SearchEngine instance |

#### Admin-Only Components (inline within pages)
- TipTap rich text editor (in article creation/edit pages)
- Excel file upload UI (quiz import)
- Image multi-upload (burning issues)
- PDF upload (magazines)
- Course tree manager

### Authentication (Admin Portal)
- `AuthContext.tsx` at `app/admin/AuthContext.tsx`
- JWT stored in `localStorage` keys: `token`, `user`
- Admin layout wraps all `/admin/*` routes in `AuthProvider`
- Login page at `/admin/login` — redirects to dashboard on success
- Non-admin users redirected to `/`

### API Client Layer (`lib/api.ts`)
- `API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'`
- Exports typed fetch functions: `getArticlesByDate`, `getAdjacentDates`, `getQuizzesByDate`, `getBurningIssuesList`, `getMagazines`, etc.
- Pagination response shape: `{ success, data, pagination: { page, limit, total, pages } }`
- Date helpers: `formatDate()` → ISO string, `formatDisplayDate()` → locale string

### Next.js Config
- `reactStrictMode: true`
- `canvas: false` alias (required for react-pdf / pdfjs)
- No image domain allowlist set — S3 URLs and local URLs used directly via `<img>` tags

### Tailwind Config (client)
- Primary: `#f5a623` (override — but design system uses `#1E3A5F` via CSS vars — follow style.json, not tailwind theme)
- Font: Inter
- Custom animations: `fade-in-up`, `slide-in`

---

## 📦 SHARED PACKAGES (packages/)

### @repo/types (packages/types/index.ts)
Shared TypeScript interfaces:
- `IUser`, `IArticle`, `IQuestion`, `IQuiz`, `IMagazine`, `ICourseNode`, `IContentTab`
- `TOPIC_TAGS` constant array: Polity, Economy, Environment, S&T, IR, History, Geography, Art & Culture, Social Issues, Security, Ethics
- `ApiResponse<T>`, `PaginatedResponse<T>`

> Note: `packages/types` types are slightly behind API model types (e.g. MagazineCategory only has 2 values in types vs 4 in API). The API models are the source of truth.

---

## 🔄 DATA FLOW

```
Student opens app
  → Next.js client (port 3000)
  → lib/api.ts fetchApi()
  → Express API (port 4000)
  → Mongoose → MongoDB
  → JSON response

Admin creates content
  → /admin/* pages
  → Direct fetch() with Bearer token
  → Protected API routes
  → MongoDB + local /uploads or S3
```

---

## 📐 CODING PATTERNS & CONVENTIONS

### Backend
- All controllers return `{ success: boolean, data?, message?, pagination? }`
- All async route handlers use try/catch and return proper HTTP status codes
- `req.user` is attached by `protect` middleware (type: `IUser`)
- ESM imports (`.js` extensions required in imports even for `.ts` files e.g. `'./models/User.js'`)
- File upload uses `multer.diskStorage` for local files, `multer.memoryStorage` for S3 uploads

### Frontend
- All pages under `app/` are Server Components by default; add `'use client'` when needed
- Admin pages all start with `'use client'` and use `useAuth()` hook
- API calls in student portal use `lib/api.ts` functions (not direct fetch)
- API calls in admin portal use direct `fetch()` with `Authorization: Bearer ${token}`
- State management: React `useState` + `useEffect` (no Redux/Zustand)
- Date navigation pattern: `DatePicker` component with prev/next arrows + adjacent-dates API
- Quiz state: per-question answered state, show correct/incorrect feedback immediately

### Styling
- **Priority:** `style.json` tokens → CSS variables in `globals.css` → Tailwind utilities
- Custom CSS classes: `ca-*` (current affairs page), `article-*` (article renderer), `rte-*` (rich text editor)
- Mobile-first, `md:` breakpoint for tablet+
- Bottom nav hidden on `/admin` routes via `pathname?.startsWith('/admin')` check
- Animations: `animate-fade-in-up` with `animationDelay` for staggered sections

---

## ⚠️ KNOWN ISSUES & GOTCHAS

1. **JWT expiry inconsistency:** `auth.middleware.ts` sets `expiresIn: '7d'` but `auth.controller.ts` uses `expiresIn: '30d'`. The controller generates the token for login — so effectively 30d. Keep 30d.
2. **MongoDB Atlas:** The `.env` file may have been updated to use MongoDB Atlas URI in conversation `285017db`. Always verify `MONGO_URI` before local development.
3. **No `NEXT_PUBLIC_API_URL` in client .env:** The client reads `process.env.NEXT_PUBLIC_API_URL` which defaults to `http://localhost:4000`. For production, create `apps/client/.env.local`.
4. **TipTap Editor:** Article content is stored as TipTap JSON string in the `content` field. The `RichTextRenderer` parses this. Fallback to `dangerouslySetInnerHTML` for legacy HTML content.
5. **`react-pdf` canvas alias:** `next.config.mjs` has `config.resolve.alias.canvas = false` — do not remove.
6. **Admin login redirect:** Admin in `AuthContext` redirects to `/admin/login` when not authenticated. The layout page at `/admin/login` bypasses the sidebar rendering.
7. **`features/` dir is empty:** `apps/client/src/features/` exists but is empty — planned feature module directory.
8. **`web/` and `docs/` apps:** These are leftover Turborepo stubs. They are not part of the product.
9. **File upload local vs S3:** Burning issues and magazines use LOCAL disk. The S3 service is for article images uploaded via TipTap editor and the generic upload endpoints. Do not mix these.
10. **Tailwind primary color mismatch:** `tailwind.config.js` sets `primary: #f5a623` but the design system uses `#1E3A5F`. Always use style.json values (via CSS vars or literal hex), not Tailwind's `primary` color.

---

## 🗺️ WHAT IS BUILT (STATUS AS OF APRIL 2026)

### ✅ COMPLETE
- Backend API (all 8 routes: auth, articles, burning-issues, magazines, quizzes, courses, upload, search)
- All Mongoose models (User, Article, BurningIssue, Magazine, Quiz, CourseNode)
- Admin Portal: dashboard, articles CRUD (with TipTap editor), burning-issues CRUD, magazines CRUD, quizzes CRUD (+ Excel import), courses manager
- Student Portal: Home page, Daily Prelims page, Daily Mains page, Daily Quiz page, Magazines page, Burning Issues page, Topics page, Search page
- Authentication flow (JWT, localStorage, role guard)
- Design system (style.json, globals.css, CSS variables)
- Mobile-first layout with bottom navigation
- `RichTextRenderer` (TipTap JSON → styled HTML)
- `DatePicker` component with prev/next day navigation
- `QuizOption` component with answer states
- `BurningIssuesGallery` image carousel
- S3 service and local file upload (multer)
- Excel quiz import service
- Excel article import: Daily Prelims + **Mains** (separate parsers, separate routes)
- Mains article structured layout: title → visual summary modal → context → Q&A accordion (up to 6) → source → tags → practice → value additions
- Unified search across articles + quizzes
- Client-side search engine (Trie + Inverted Index) with sessionStorage cache — zero API calls per search
- Shared types package (`@repo/types`)

### 🚧 PARTIALLY BUILT / NEEDS WORK
- **Student Login/Registration:** There are routes (`/api/auth/register`, `/api/auth/login`) but NO student-facing login/profile page in the client app. The `/profile` route in the bottom nav links to `/profile` but no page exists.
- **Courses/Topics browser:** `/topics` page exists but needs to properly render the course tree/hierarchy.
- **Magazine PDF reader:** `/magazines/reader` sub-directory exists but details unknown.
- **Admin recent activity section:** Placeholder text says "No recent activity to show" — not yet implemented.
- **Course content tabs:** Video, notes, and test tabs exist in schema but unknown if UI is complete.
- **Mobile responsiveness refinement:** Conversation `073e7bf3` focused on mobile responsive templates for invitation templates (different project?). The Shailaja IAS client uses TailwindCSS responsive classes but may need further mobile polish.

### ❌ NOT STARTED / FUTURE FEATURES
- Student subscription/payment system
- Student progress tracking (quiz scores, completion)
- Push notifications
- Student profile page (`/profile`)
- ~~Search result page refinement~~ (DONE — client-side Trie + Inverted Index)
- App-wide loading states / skeleton screens
- Error boundary handling
- Dark mode (CSS vars set up for it in globals.css but not actively used)
- Deployment/CI CD configuration
- Admin: recent activity feed
- Admin: analytics dashboard

---

## 📋 HOW TO START A SESSION

**Every new session, do this in order:**

1. **Read this file fully** — you just did that ✓
2. **Check `apps/client/app/style.json`** — before touching any UI
3. **Read `.agent/workflows/apply_style.md`** — before styling anything
4. **Verify `.env`** — confirm MongoDB URI and port settings
5. **Start servers:** `pnpm run nuke` in the repo root
6. **Understand the task** — map it to the right layer (API model → controller → route → client page/component)

---

## 📅 CHANGELOG (Update after every session)

### Session: 2026-04-19 — Burning Issues UX Redesign
- **Problem:** Each BurningIssue's images were flattened into individual grid cards (a 5-image topic = 5 identical cards). Instagram-stories metaphor was wrong for educational content.
- **Fix:** Complete rewrite of `app/burning-issues/page.tsx`:
  - **Topic List:** One card per BurningIssue showing cover image, topic, image count badge, date. Grid: 2 cols mobile, 3 tablet, 4 desktop.
  - **Gallery Viewer:** In-page viewer with arrow nav, touch swipe, dot indicators, thumbnail strip, keyboard support (←→ Esc).
  - Light theme (`bg-[#FAFAF8]`) consistent with app.
  - Deep-link support via `?id=` query param.
- **Also updated:** `src/components/BurningIssuesGallery.tsx` (home page) — same one-card-per-topic style.
- **Removed:** Dark theme, full-screen story viewer, article data mixing, progress bar segment rendering.

### Session: 2026-04-19 — Global Header + Auto-Breadcrumbs
- **Feature:** Persistent brand header on all student pages with `symbol.png` + `name.png` → links to landing page. Search icon in header navigates to `/search`.
- **Feature:** Auto-generating breadcrumbs that read `usePathname()` and map segments to labels via `ROUTE_LABELS` config. Unknown routes auto title-case the slug. All crumbs except the last are clickable `<Link>` elements.
- **New files:**
  - `components/Header.tsx` — fixed header, hidden on `/admin/*`, future tabs slot
  - `components/Breadcrumbs.tsx` — auto-breadcrumbs, hidden on `/` and `/admin/*`
- **Modified:** `app/layout.tsx` — added `<Header />` + `<Breadcrumbs />` before `{children}`
- **Cleaned up 8 pages** — removed inline headers/breadcrumbs from: landing, daily-prelims, daily-mains, daily-quiz, burning-issues, magazines, topics, search
- **Also removed** duplicate inline bottom-nav from landing page (global `BottomNav` already renders)
- **For future modules:** Just add one entry to `ROUTE_LABELS` in `Breadcrumbs.tsx`. If forgot, title-case fallback auto-generates a label.

### Session: 2026-04-19 — Daily Quiz "Go to latest quiz" CTA
- **Feature:** When user opens `/daily-quiz` on a date with no quizzes, show a CTA button to jump to the most recent quiz.
- **File changed:** `apps/client/app/daily-quiz/page.tsx` (empty state block only)
- **Zero API overhead:** Reuses `adjacentDates.previous` already returned by the parallel `getAdjacentQuizDates()` call. No new endpoints, no new fetches.
- **UX:** CTA shows "Go to latest quiz" + badge with the date (e.g. "17 Apr"). Clicking sets `date` state → triggers existing `useEffect` → loads quiz data + new adjacent dates → DatePicker, prev/next all sync automatically.
- **Design:** Uses `#1E3A5F` primary with shadow, `active:scale` micro-animation, clipboard icon in empty state circle.

### Session: 2026-05-03 — Client-Side Search Engine + 5 Bug Fixes
- **Major feature: Client-side search engine** — Replaced per-keystroke MongoDB `$regex` search with in-browser Trie + Inverted Index. Estimated 95-99% reduction in search API costs.
  - New API: `GET /api/search/index` serves lightweight metadata (`{_id, title, type, date, tags}`) with ETag/304 + 5-min server memory cache.
  - New client libs: `lib/search-engine.ts` (Trie for title prefix search, Inverted Index for O(1) tag lookup), `lib/search-cache.ts` (sessionStorage), `hooks/useSearchEngine.ts` (React hook).
  - Updated pages: `search/page.tsx`, `admin/articles/page.tsx` (cache badge + refresh), `topics/page.tsx` (tag chips use Inverted Index).
  - All tag links unified to `/search?tag=X`. 3-character minimum enforced with UI hint.
  - Server-side cache invalidation wired into article create/update/delete/import.
- **Bug fixes (5):**
  - **DatePicker calendar not opening** — Auto-call `showPicker()` via ref callback when popup mounts.
  - **Magazines duplicate year** — Removed `Year {year}` text; badge now shows 📅 icon + year only.
  - **Daily Quiz date dropdown unresponsive** — Made entire container div clickable via `showPicker()`.
  - **Magazines sections not all expanded** — Changed default from `Set([currentYear])` to expand all years on load.
  - **Magazine download opens in browser** — Added `GET /api/magazines/download/:id` with `Content-Disposition: attachment` header; client uses `application/octet-stream` blob type.

### Session: 2026-04-18 — Bug Fixes (Image Error / Magazine Delete / Quiz Edit 404)
- **Bugs fixed: 3**
- **Bug 1 — Image upload error not clearing** (`admin/burning-issues/new/page.tsx`):
  - Root cause: `handleFilesSelected` never cleared the `error` state on a new file-pick attempt.
  - Fix: Added `setError('')` at the top of `handleFilesSelected` so the 5MB warning vanishes when valid files are selected.
- **Bug 2 — Magazine delete button not visible** (`admin/magazines/page.tsx`):
  - Root cause: `filterYear` defaulted to `currentYear`, so magazines uploaded for other years showed an empty list with no rows/buttons.
  - Also: `fetchMagazines` called even before `token` was set due to missing guard.
  - Fix: Changed `filterYear` default to `''` (All Years). Added "All Years" button to UI. Added `if (token)` guard to `useEffect`. API call now omits `year` param when "All Years" is selected.
- **Bug 3 — Quiz Edit gives 404** (`admin/quizzes/[id]/page.tsx`):
  - Root cause: The quiz list links to `/admin/quizzes/${id}` but the dynamic route `app/admin/quizzes/[id]/page.tsx` didn't exist.
  - Fix: Created the `[id]` page. Fetches quiz data by ID, pre-fills all fields (title, date, setName, questions/options/correctIndex/explanation/subject), submits via `PUT /api/quizzes/:id`.

### Session: 2026-05-10 — Mains Article Module Rebuild (Excel Import + Structured Q&A)
- **Major feature: Complete rebuild of the Mains article module**
  - **Backend — Article model extended** with 5 new optional fields: `context`, `questions[]` (up to 6 Q&A pairs), `practice`, `valueAdditions`, `visualSummaryUrl`. Backward-compatible — existing Prelims articles unaffected.
  - **New service: `mains-excel.service.ts`** — Parses Mains Excel files with 21 columns: Date, Title, Subject, Tags, Source, Practice, Value Additions, Context, Q1–Q6, A1–A6, Image. Reuses shared helpers (date parsing, Drive URL resolution).
  - **New route: `POST /api/articles/import-mains-excel`** — Bulk import endpoint for Mains articles (separate from Prelims import).
  - **Admin: `/admin/articles/import-mains`** — Dedicated import page with purple accent, Excel format guide, file upload.
  - **Admin: Articles list** — Now shows 3 buttons: "Import Prelims" (green), "Import Mains" (purple), "Create Article" (amber).
  - **Student: `/daily-mains` complete rewrite** — Structured layout:
    1. Title (Playfair Display h1)
    2. Visual Summary button → fullscreen image modal (Escape to close)
    3. Context section (orange left-border card)
    4. Q&A Accordion — up to 6 questions with smooth expand/collapse animation, numbered badges (navy collapsed → orange active)
    5. Source (gray card)
    6. Tags (clickable → `/search?tag=X`, indigo pills, primary tag gets amber)
    7. Practice section (teal left-border card)
    8. Value Additions (orange left-border card)
    9. Prev/Next navigation
  - **Legacy fallback:** Articles without structured fields still render via `RichTextRenderer`
  - **Search integration:** Already working — Mains articles indexed by Trie (title) and Inverted Index (tags) with no changes needed.
  - **~550 lines of new CSS** in `globals.css` for `.mains-*` classes.
- **Files created:**
  - `apps/api/src/services/mains-excel.service.ts`
  - `apps/client/app/admin/articles/import-mains/page.tsx`
- **Files modified:**
  - `apps/api/src/models/Article.ts` — 5 new fields + IMainsQuestion interface
  - `apps/api/src/controllers/article.controller.ts` — `importMainsFromExcel` function
  - `apps/api/src/routes/article.routes.ts` — new mains import route
  - `apps/client/app/daily-mains/page.tsx` — complete rewrite
  - `apps/client/app/globals.css` — ~550 lines of mains-specific CSS
  - `apps/client/app/admin/articles/page.tsx` — added Import Mains button
- **Gotcha:** The `content` field is `required: true` in the Article schema, so even Mains articles populate it with a minimal fallback (context + first Q&A). The student page uses the structured fields if available, else falls back to `content`.
  - **Admin: Create/Edit Article form** — When `type === 'mains'`, the form dynamically switches from the TipTap RichTextEditor to structured Mains fields: Context (amber left-border), Q&A pairs 1–6 (blue left-border, numbered badges with ✓ Complete indicator), Practice (teal left-border), Value Additions (orange left-border), Visual Summary Image URL. On save, auto-generates `content` fallback from context + first Q&A. Edit page pre-populates all structured fields from the DB.
- **Files modified (continued):**
  - `apps/client/app/admin/articles/new/page.tsx` — dynamic Mains structured form
  - `apps/client/app/admin/articles/[id]/page.tsx` — dynamic Mains structured form + pre-populates from DB

### Session: 2026-04-18 (Project Analysis & Diary Creation)
- **Who:** AI (Antigravity) — Initial comprehensive analysis
- **What:** Read every file in the monorepo. Created this AI_DIARY.md.
- **Status:** Diary written. No code changed.
- **Key findings:**
  - Project is a UPSC prep platform with tight design system
  - Backend is complete with all 6 models and 8 route groups
  - Admin portal has full CRUD for all content types
  - Student portal has all main pages but lacks student auth/profile
  - TipTap is used for rich text in admin; custom renderer handles display
  - File uploads are split: local disk for magazines/burning-issues, S3 for article images

---

## 🔑 HOW THE AI SHOULD UPDATE THIS DIARY

At the end of every session where code was changed:

1. Add a new entry to the **CHANGELOG** section above with:
   - Date
   - What was built / changed
   - Any new gotchas discovered
   - Status of any ongoing work

2. Update the **"WHAT IS BUILT"** section:
   - Move items from "NOT STARTED" → "PARTIALLY BUILT" → "COMPLETE" as they progress

3. Add any new **KNOWN ISSUES** discovered during the session.

4. If a new model, route, page, or component was added, document it in the relevant section.

> Rule: This file must always reflect the TRUE CURRENT state of the project. An AI reading only this file should be able to start contributing within 5 minutes.
