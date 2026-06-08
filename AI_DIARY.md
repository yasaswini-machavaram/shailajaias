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
// Structured Mains fields (optional — only used by type: 'mains'):
context?, questions[] (up to 6 {question, answer}), practice?, valueAdditions?, visualSummaryUrl?
```
- Compound index: `date DESC + type`
- Text index on `title` and `tags` only (not `content`)

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

#### 7. ResourceCategory (`models/Resource.ts`)
```
title, slug (unique, auto-generated), description?, icon (emoji), accentColor (hex), order,
predefinedTags[] (e.g., ['GS1','GS2','GS3','GS4','Essay','Optional']), isPublished, createdBy
```
- Sorted by `order` for display

#### 8. ResourceItem (`models/Resource.ts`)
```
title, category (ref → ResourceCategory), tag (string, e.g., 'GS1'), pdfUrl, pdfKey,
description?, order, isPublished, createdBy
```
- PDFs stored locally in `/uploads/resource-{uuid}.pdf`
- Indexes: `{ category, order }`, `{ category, tag }`

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
| POST | `/api/articles/import-excel` | Admin | Import Prelims articles from Excel (11 columns) |
| POST | `/api/articles/import-mains-excel` | Admin | Import Mains articles from Excel (21 columns, structured Q&A) |
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
| POST | `/api/quizzes/import-excel` | Admin | Import quiz from Excel |
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
| GET | `/api/search/index` | Public | Lightweight search index for client-side Trie + Inverted Index — includes articles + quizzes + burning issues (ETag + 5-min server cache) |
| GET | `/api/search` | Public | Unified search — legacy fallback (articles + quizzes) |
| GET | `/api/resources/categories` | Public | List all published resource categories with item counts |
| GET | `/api/resources/categories/:id` | Public | Single category + its published items |
| POST | `/api/resources/categories` | Admin | Create resource category |
| PUT | `/api/resources/categories/:id` | Admin | Update resource category |
| DELETE | `/api/resources/categories/:id` | Admin | Delete category + all items + PDF files |
| POST | `/api/resources/items` | Admin | Create resource item (multipart PDF) |
| PUT | `/api/resources/items/:id` | Admin | Update resource item (optional PDF re-upload) |
| DELETE | `/api/resources/items/:id` | Admin | Delete resource item + PDF file |
| GET | `/api/resources/download/:id` | Public | Download resource PDF (Content-Disposition: attachment) |

### Auth Middleware
- `protect`: Verifies Bearer JWT, attaches `req.user`
- `adminOnly`: Checks `req.user.role === 'admin'`
- **Two `generateToken` functions exist (inconsistency):**
  - `auth.middleware.ts` → `{ id, email, role }`, `expiresIn: '7d'` — NOT used for login/register
  - `auth.controller.ts` → `{ id }`, `expiresIn: '30d'` — THIS is the one used for login/register
  - The controller's token is what users actually receive, so effective expiry is **30d** and payload is `{ id }` only

### Services
- `s3.service.ts`: `uploadToS3`, `getPresignedUrl`, `deleteFromS3`
- `excel.service.ts`: `parseQuizExcel` — parses `.xlsx`/`.xls` files into quiz question arrays (columns: Question, Option A-D, Correct Answer, Explanation, Subject)
- `article-excel.service.ts`: `parseArticleExcel` — parses Prelims Excel (11 columns: S.No, Date, Subject, Title, In News, Content, Source Link, Ext Image URL, Image ID, Tags, Additional Info)
- `mains-excel.service.ts`: `parseMainsExcel` — parses Mains Excel (21 columns: Date, Title, Subject, Tags, Source, Practice, Value Additions, Context, Q1-Q6, A1-A6, Image)

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
/                        → Landing page — hero banner, 5 module nav cards, testimonials, announcements, footer
/current-affairs         → Current Affairs hub (was previously / — Daily Updates, Resources, Burning Issues, Magazines)
/daily-prelims           → Daily Prelims articles
/daily-mains             → Daily Mains articles
/daily-quiz              → Daily Quiz
/magazines               → Magazines listing + PDF reader
/magazines/reader        → PDF reader view
/burning-issues          → Burning Issues gallery
/topics                  → Course/topic browser
/search                  → Global search
/resources               → Resources accordion (categories + items)
/resources/reader        → Resource PDF reader view
/tests                   → Tests hub — 5 submodule cards (Prelims/Mains Test Series, Practice Tests, CA Prelims)
/tests/prelims-test-series    → Prelims Test Series — proper exam mode quiz engine. During test: countdown timer (1min/Q), options show only selected/unselected state (NO correct/incorrect reveal, NO explanation). After finishing (or timer expiry): detailed analysis dashboard (score, stats, subject breakdown, question map) + Review Mode reveals correct answers + explanations. No learning/test toggle — always test mode.
/tests/prelims-practice-test  → Prelims Practice Test — dual-mode quiz engine. Test mode: same as prelims-test-series (timer, scoring, analysis). Learning mode: single-question attempt-first (no timer, no scoring, explanation revealed after selecting option). Mode toggle locks once test starts.
/tests/mains-test-series      → Mains Test Series (placeholder)
/tests/mains-practice-test    → Mains Practice Test (placeholder)
/tests/ca-prelims             → CA Prelims (placeholder)
/admin                   → Admin dashboard (requires login)
/admin/login             → Admin login
/admin/articles          → Article CRUD (list, filter, search, delete)
/admin/articles/new      → Create article (TipTap editor for Prelims; structured form for Mains)
/admin/articles/[id]     → Edit article (same dynamic form)
/admin/articles/import   → Import Prelims articles from Excel
/admin/articles/import-mains → Import Mains articles from Excel (structured Q&A)
/admin/burning-issues    → Burning Issues CRUD
/admin/burning-issues/new→ Create burning issue (image upload)
/admin/magazines         → Magazine CRUD (PDF upload)
/admin/quizzes           → Quiz CRUD
/admin/quizzes/new       → Create quiz
/admin/quizzes/[id]      → Edit quiz
/admin/quizzes/import    → Import quiz from Excel
/admin/courses           → Course tree manager
/admin/resources         → Resource categories + items CRUD (two-tab layout)
```

### Key Components

#### Student Portal Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `BottomNav` | `components/BottomNav.tsx` | Mobile bottom nav (hidden on /admin) |
| `Header` | `components/Header.tsx` | Fixed brand header with logo + search icon (hidden on /admin) |
| `Breadcrumbs` | `components/Breadcrumbs.tsx` | Auto-generated breadcrumbs from `usePathname()` (hidden on `/` and `/admin`) |
| `DatePicker` | `components/DatePicker.tsx` | Prev/Next day date selector for articles/quiz |
| `QuizOption` | `components/QuizOption.tsx` | Individual quiz answer option with states |
| `RichTextRenderer` | `components/RichTextRenderer.tsx` | Renders TipTap JSON to styled HTML |
| `TagChips` | `components/TagChips.tsx` | Tag display component (links to `/search?tag=`) |
| `BurningIssuesGallery` | `src/components/BurningIssuesGallery.tsx` | Image carousel for burning issues (home page) |
| `Header` (src) | `src/components/Header.tsx` | Legacy/secondary header component (used by src barrel) |
| `SearchBar` | `src/components/SearchBar.tsx` | Search input |
| `MagazineCard` | `src/components/MagazineCard.tsx` | Magazine display card |
| `QuickAccessCard` | `src/components/QuickAccessCard.tsx` | Home page quick access card |

#### Client-Side Search Libraries
| File | Location | Purpose |
|------|----------|---------|
| `SearchEngine` | `lib/search-engine.ts` | Trie (prefix tree) + Inverted Index for in-browser search |
| `SearchCache` | `lib/search-cache.ts` | sessionStorage cache manager for the search index |
| `useSearchEngine` | `hooks/useSearchEngine.ts` | React hook providing ready-to-use SearchEngine instance |

#### Admin-Only Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `RichTextEditor` | `components/admin/RichTextEditor.tsx` | TipTap rich text editor (used in Prelims/BurningIssue article forms) |

Additional inline admin UI (not separate components):
- Excel file upload UI (quiz import, article import)
- Image multi-upload (burning issues)
- PDF upload (magazines)
- Course tree manager
- Mains structured form (context, Q&A pairs, practice, value additions)

### Authentication (Admin Portal)
- `AuthContext.tsx` at `app/admin/AuthContext.tsx`
- JWT stored in `localStorage` keys: `token`, `user`
- Admin layout wraps all `/admin/*` routes in `AuthProvider`
- Login page at `/admin/login` — redirects to dashboard on success
- Non-admin users redirected to `/`

### API Client Layer (`lib/api.ts`)
- `API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'`
- Exports typed fetch functions:
  - Articles: `getArticlesByDate`, `getAdjacentDates`, `getArticleById`, `getBurningIssues` (articles endpoint)
  - Quizzes: `getQuizzesByDate`, `getQuizByDate`, `getQuizById`, `getAdjacentQuizDates`
  - Burning Issues: `getBurningIssuesList`, `getBurningIssueById`
  - Magazines: `getMagazines`, `getMagazineById`
  - Stats: `getStats` (home page counts — articles, burningIssues, magazines, quizzes, courses)
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
- Custom CSS classes: `ca-*` (current affairs page), `mains-*` (mains article page), `article-*` (article renderer), `rte-*` (rich text editor)
- Mobile-first, `md:` breakpoint for tablet+
- Bottom nav hidden on `/admin` routes via `pathname?.startsWith('/admin')` check
- Animations: `animate-fade-in-up` with `animationDelay` for staggered sections

---

## ⚠️ KNOWN ISSUES & GOTCHAS

1. **JWT expiry + payload inconsistency:** Two separate `generateToken` functions exist. `auth.middleware.ts` creates payload `{ id, email, role }` with `7d` expiry but is NOT used for login. `auth.controller.ts` creates payload `{ id }` only with `30d` expiry and IS used for login/register. Effective expiry is 30d, effective payload is `{ id }` only. The middleware's `protect` function calls `User.findById(decoded.id)` so both payloads work, but the middleware's own `generateToken` is essentially unused dead code.
2. **MongoDB Atlas:** The `.env` file may have been updated to use MongoDB Atlas URI in conversation `285017db`. Always verify `MONGO_URI` before local development.
3. **No `NEXT_PUBLIC_API_URL` in client .env:** The client reads `process.env.NEXT_PUBLIC_API_URL` which defaults to `http://localhost:4000`. For production, create `apps/client/.env.local`.
4. **TipTap Editor:** Article content is stored as TipTap JSON string in the `content` field. The `RichTextRenderer` parses this. Fallback to `dangerouslySetInnerHTML` for legacy HTML content.
5. **`react-pdf` canvas alias:** `next.config.mjs` has `config.resolve.alias.canvas = false` — do not remove.
6. **Admin login redirect:** Admin in `AuthContext` redirects to `/admin/login` when not authenticated. The layout page at `/admin/login` bypasses the sidebar rendering.
7. **`features/` dir is empty:** `apps/client/src/features/` exists but is empty — planned feature module directory.
8. **`web/` and `docs/` apps:** These are leftover Turborepo stubs. They are not part of the product.
9. **File upload local vs S3:** Burning issues and magazines use LOCAL disk. The S3 service is for article images uploaded via TipTap editor and the generic upload endpoints. Do not mix these.
10. **Tailwind primary color mismatch:** `tailwind.config.js` sets `primary: #f5a623` but the design system uses `#1E3A5F`. Always use style.json values (via CSS vars or literal hex), not Tailwind's `primary` color.
11. **`createArticle` / `updateArticle` controllers don't handle Mains structured fields:** The `createArticle` and `updateArticle` functions in `article.controller.ts` only destructure `{ type, title, date, tags, content, keywords, imageUrl, source }` from `req.body`. They do NOT extract or save `context`, `questions`, `practice`, `valueAdditions`, or `visualSummaryUrl`. The admin create/edit forms send these fields, but they are silently dropped. The **Excel import** works correctly because it uses `Article.insertMany()` directly. This needs to be fixed by extending both controller functions to handle the Mains fields.

---

## 🗺️ WHAT IS BUILT (STATUS AS OF MAY 2026)

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
- Unified search across articles + quizzes + burning issues
- Client-side search engine (Trie + Inverted Index) with sessionStorage cache — zero API calls per search
- Search index API (`/api/search/index`) with ETag/304 + 5-min server-side memory cache
- Global Header (`components/Header.tsx`) + Auto-Breadcrumbs (`components/Breadcrumbs.tsx`)
- Shared types package (`@repo/types`)
- **Resource module:** Categories (submodules) + Items (PDFs) — admin CRUD, student accordion browse, PDF reader
  - Admin: category management (icons, colors, predefined tags) + item upload (PDF, tag, category)
  - Student: `/resources` accordion page + `/resources/reader` PDF viewer (react-pdf)
  - Bottom nav points to `/resources`
  - 9 API endpoints under `/api/resources/`

### 🚧 PARTIALLY BUILT / NEEDS WORK
- **Test Series Module:** `/tests` hub page with 5 submodule cards. **Prelims Test Series** and **Prelims Practice Test** submodules are COMPLETE with full quiz engines (timer, UPSC scoring, detailed analysis). Mains Test Series, Mains Practice Test, and CA Prelims remain placeholder "Coming Soon" pages.
- **Student Login/Registration:** There are routes (`/api/auth/register`, `/api/auth/login`) but NO student-facing login/profile page in the client app. The `/profile` route in the bottom nav links to `/profile` but no page exists.
- **Courses/Topics browser:** `/topics` page exists but needs to properly render the course tree/hierarchy.
- **Magazine PDF reader:** `/magazines/reader` contains `PdfViewerClient.tsx` (11KB react-pdf component) + a thin `page.tsx` wrapper. Functional but may need UX polish.
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

### Session: 2026-06-08 — Test Series Question Paper & Solution PDF Uploads
- **Who:** AI (Antigravity)
- **What:** Added capability for administrators to upload Question Paper and Detailed Solution PDFs for each test in the Prelims Test Series submodule, and configured student download buttons to open these files directly (falling back to dynamic client print layouts if absent).
- **Files created/modified:**
  - `packages/types/index.ts` — Added `questionPaperUrl`, `questionPaperKey`, `solutionPaperUrl`, `solutionPaperKey` optional properties to `ITestSeriesItem` interface.
  - `apps/api/src/models/TestSeries.ts` — Added the same fields to `ITestSeriesItem` typescript interface and Mongoose schema definition so they persist correctly in the database.
  - `apps/client/app/admin/test-series/prelims-test-series/page.tsx` — Extended `TestItemForm` interface, added `handlePaperUpload` helper using express multer upload route, mapped new fields in form state changers (`handleEditClick`, `handleAddNewTest`), and added PDF file inputs inside each test item editing card block.
  - `apps/client/app/tests/prelims-test-series/page.tsx` — Updated Download Question and Detailed Solution buttons to link directly to the uploaded static files (via `API_URL` prefixing) with fallback to the dynamic Next.js client print layouts (`/tests/print-test?id=...`).
- **Gotchas:**
  - Standardized database mapping in `apps/api/src/controllers/testSeries.controller.ts` leverages `...t` which automatically copies the newly added fields.
  - Ensure the client's `solutionPaperUrl` and `solutionPaperKey` fields match the database schema fields.

### Session: 2026-06-08 — Test Series Timer, UPSC Scoring & Detailed Analysis
- **Who:** AI (Antigravity)
- **What:** Integrated countdown timer, UPSC negative marking scoring, and detailed post-test analysis dashboard into Prelims Test Series and Prelims Practice Test (test mode). Overhauled learning mode in Practice Test from "answers shown upfront" to "attempt-first-then-reveal".
- **Scoring formula:** `totalScore = (correct × 2) - (incorrect × 2/3)`. Unattempted = 0. Max = totalQ × 2.
- **Timer:** 1 minute per question. Total = numberOfQuestions × 60s. Auto-submits on expiry. Timer pulses red when < 60s. Timer exists ONLY in test mode (both pages) — NOT in learning mode.
- **Exam Mode UX (prelims-test-series):** Correct/incorrect answers and explanations are hidden during the test. Options show a clean blue "Selected" state. Options do not freeze; users can click different options to change their answer (last clicked becomes selected).
- **KPI Bar (prelims-test-series):** Shows `Attempted | Unattempted | Skipped` during the test instead of correct/wrong, preserving the exam mode secrecy.
- **Accordion Expand UX:** Tapping anywhere on a test series card header (except the START button) toggles description expansion.
- **Ask Doubt Integration:** Added an "Ask Doubt" button to the post-test analysis page next to the action buttons, allowing students to trigger the WhatsApp/email doubt modal for the `activeTestItem`.
- **Analysis dashboard:** Replaces old simple 2-stat scorecard. Shows: total score/maxMarks, correct/incorrect/unattempted with progress bars, accuracy %, negative marks lost, time taken (MM:SS), subject-wise breakdown table (if questions have `subject` field), color-coded question map grid (green=correct, red=incorrect, gray=unattempted). Each grid cell is clickable → enters Review Mode showing question + your answer + correct answer + explanation.
- **Learning mode (prelims-practice-test only):** Changed from scrollable all-questions list (answers/explanations pre-revealed) → single-question-at-a-time navigation where user must select an option first, then correct/incorrect highlighting + explanation revealed. No timer, no scoring, no scorecard.
- **Mode toggle lock:** Once user answers any question in test mode, Learning↔Test toggle is disabled (shows "Mode locked during test"). Prevents gaming the timer.
- **Key state vars added:** `timeRemaining`, `testStartTime`, `timerRef` (useRef for setInterval), `showReview`, `hasStartedTest` (practice test only), `activeTestItem` (tracks the TestSeriesItem currently being taken as a quiz).
- **Key functions added:** `formatTime()`, `getTimeTaken()`, `getStats()` (useCallback — returns correct/incorrect/unattempted/totalScore/maxMarks/negativeMarks/accuracy), `getSubjectBreakdown()` (useCallback — per-subject stats), `handleFinishTest()` (stops timer + shows scorecard).
- **Files modified:**
  - `apps/client/app/tests/prelims-test-series/page.tsx` — Removed learning/test mode toggle (always test mode now). Added timer useEffect, scoring helpers, detailed analysis dashboard, review mode, question navigation grid, header accordion tap handlers, non-freezing options, custom exam KPI bar, and "Ask Doubt" dashboard action button with `activeTestItem` tracking.
  - `apps/client/app/tests/prelims-practice-test/page.tsx` — Added timer (test mode only), scoring helpers, detailed analysis (test mode only), rewrote learning mode to attempt-first, added mode toggle lock with `hasStartedTest` state.
- **Gotchas:**
  - `selectedIdx` is scoped inside `.map()` callback — cannot reference it outside. Use `answers[currentQuestionIndex]` in outer scope instead.
  - Timer `useEffect` deps: must include `activeQuiz`, `showScorecard` (and `learnMode` for practice test) to properly start/stop. Cleanup function must clear interval.
  - Subject-wise breakdown only renders if there are multiple subjects (hides if all questions are 'General').
  - Ensure `activeTestItem` is cleared out when exiting back to the main series screen so that the doubt modal state is clean.

### Session: 2026-06-03 — Prelims Test Series Group Visibility Fix
- **Who:** AI (Antigravity)
- **What:** Fixed visibility issue of newly added Prelims Test Series groups in the student portal. Manually published the user's test series group in MongoDB. Configured cache-busting headers in client API service to ensure dynamic updates load instantly.
- **Files modified:**
  - `apps/client/lib/api.ts` — Updated `fetchApi` function to include `{ cache: 'no-store' }` to ensure Next.js App Router and browsers bypass cache for dynamic data fetches.
- **Gotchas & Discoveries:** Test series groups are created in `isPublished: false` (Draft) status by default. The admin must check the "Publish to students" checkbox and save for it to be visible in the user portal.

### Session: 2026-06-03 — Prelims Test Series Submodule (Excel Import & Client-Side print generation)
- **Who:** AI (Antigravity)
- **What:** Completed implementation of the Prelims Test Series submodule. Simplified the admin workflow: removed PDF paper uploads and manual quiz reference selectors, replacing them with a direct Excel question importer (reusing the Current Affairs format). Student offline downloads are now dynamically formatted as print/PDF layouts generated in-browser.
- **Files created/modified:**
  - [index.ts](file:///Users/thirunavukarasu/ShailajaIASApp/shailaja-ias/packages/types/index.ts) — Removed paper file keys from `ITestSeriesItem` typescript interface.
  - [TestSeries.ts](file:///Users/thirunavukarasu/ShailajaIASApp/shailaja-ias/apps/api/src/models/TestSeries.ts) — Modified schema to remove question and solution paper fields.
  - [testSeries.controller.ts](file:///Users/thirunavukarasu/ShailajaIASApp/shailaja-ias/apps/api/src/controllers/testSeries.controller.ts) — Implemented `importTestExcel` controller to parse Excel files and auto-create Quiz documents. Cleans up associated quizzes when a test series is deleted.
  - [testSeries.routes.ts](file:///Users/thirunavukarasu/ShailajaIASApp/shailaja-ias/apps/api/src/routes/testSeries.routes.ts) — Mounted `POST /import-excel` using in-memory multer buffers and cleaned up paper upload routes.
  - [page.tsx](file:///Users/thirunavukarasu/ShailajaIASApp/shailaja-ias/apps/client/app/admin/test-series/page.tsx) — Redesigned the CMS editor. Removed PDF fields and manual dropdowns, and integrated direct Excel file uploads.
  - [page.tsx](file:///Users/thirunavukarasu/ShailajaIASApp/shailaja-ias/apps/client/app/tests/print-test/page.tsx) — [NEW] Created a print-friendly page layout supporting both question booklets and explanation sheets, triggering `window.print()` automatically.
  - [page.tsx](file:///Users/thirunavukarasu/ShailajaIASApp/shailaja-ias/apps/client/app/tests/prelims-test-series/page.tsx) — Redesigned student download buttons to open `/tests/print-test` in new tabs with mode query parameters.
- **Verified:** Both `api` and `client` build and compile successfully with Next.js static generation.

### Session: 2026-06-03 — Admin Test Series Hub and Route Restructuring
- **Who:** AI (Antigravity)
- **What:** Completed implementation of the Admin Test Series dashboard / hub page with 5 submodules matching the student view layout. Rearranged the routes to allocate a dedicated manager page for Prelims Test Series.
- **Files created/modified:**
  - `apps/client/app/admin/test-series/page.tsx` — Replaced the old Prelims Test Series manager with a 5-submodule Hub dashboard containing cards for Prelims/Mains Series & Practice tests and CA Prelims.
  - `apps/client/app/admin/test-series/prelims-test-series/page.tsx` — [NEW] Created this dedicated route and moved the existing Prelims Test Series editor/uploader panel here.
  - `apps/client/app/admin/quizzes/page.tsx` — Modified tab parsing to read URL search parameters on mount, routing the user automatically to the `'practice'` tab from the Hub. Added dynamic URL builders passing `?type=practice` to Create/Import buttons.
  - `apps/client/app/admin/quizzes/new/page.tsx` & `apps/client/app/admin/quizzes/import/page.tsx` — Added client-side query string reader to auto-select `prelims-practice` type when navigating from the hub.
- **Verified:** Client compiles and builds successfully via Next.js with all 39 static routes.

### Session: 2026-06-03 — Admin Quizzes Filtering and Tag Management
- **Who:** AI (Antigravity)
- **What:** Fixed visibility issue of Prelims Practice Tests in the Admin Portal. Added tabs to filter and separate Daily Quizzes from Prelims Practice Tests and Test Series Quizzes. Integrated a "Quiz Type" selector (Daily Quiz vs. Prelims Practice Test) to new, edit, and import forms to automate the assignment of the 'prelims-practice' tag and eliminate typos.
- **Files modified:**
  - `apps/client/app/admin/quizzes/page.tsx` — Added tab filters (All, Daily, Practice, Series), increased fetch limit to 100, styled tags with distinct color-coded badges.
  - `apps/client/app/admin/quizzes/new/page.tsx` — Added Quiz Type dropdown, automatically appends `'prelims-practice'` to tags for practice tests.
  - `apps/client/app/admin/quizzes/[id]/page.tsx` — Pre-selects Quiz Type on load and appends/removes tag on save.
  - `apps/client/app/admin/quizzes/import/page.tsx` — Added Quiz Type selector to import form, automatically appends the tag to FormData tags field.
- **Verified:** Client compiles and builds successfully via Next.js.

### Session: 2026-06-03 — Prelims Practice Test Submodule Implementation
- **Who:** AI (Antigravity)
- **What:** Completed implementation of the Prelims Practice Test submodule, including dynamic quiz filtering by subject, learning/test mode toggling, layout customization matching design references, guidelines/orientation modals, and backend excel upload/quiz tags adjustments.
- **Files modified:**
  - `apps/api/src/controllers/quiz.controller.ts` — Updated `importQuizFromExcel` to read and parse `tags` from the request body.
  - `apps/client/app/admin/quizzes/new/page.tsx` — Added Tags input field to quiz creation form and integrated it into the API request.
  - `apps/client/app/admin/quizzes/[id]/page.tsx` — Added Tags input field to quiz edit form, populating from the API and submitting changes.
  - `apps/client/app/admin/quizzes/import/page.tsx` — Added Tags input field to Excel quiz import form, appending it to the FormData submission.
  - `apps/client/lib/api.ts` — Added `getQuizzesByTag` to fetch quizzes by tag, and added `subject` field to `Question` type interface.
  - `apps/client/app/tests/prelims-practice-test/page.tsx` — Completely implemented practice tests list view and execution view, supporting subject filter, soft colored subject panels, guidelines, orientations, and Learning vs Test modes.
- **Verified:** `pnpm --filter client build` runs and builds the client package successfully.

### Session: 2026-06-03 — Test Series Module (Hub + 5 Submodule Placeholders)
- **Who:** AI (Antigravity)
- **What:** Created the Test Series module with a hub page and 5 submodule placeholder pages.
- **New files created:**
  - `apps/client/app/tests/page.tsx` — Tests hub page with 5 visually rich cards (gradient icon placeholders, bold titles, numbered feature lists, alternating tinted backgrounds, hover animations)
  - `apps/client/app/tests/prelims-test-series/page.tsx` — Placeholder (Coming Soon)
  - `apps/client/app/tests/prelims-practice-test/page.tsx` — Placeholder (Coming Soon)
  - `apps/client/app/tests/mains-test-series/page.tsx` — Placeholder (Coming Soon)
  - `apps/client/app/tests/mains-practice-test/page.tsx` — Placeholder (Coming Soon)
  - `apps/client/app/tests/ca-prelims/page.tsx` — Placeholder (Coming Soon)
- **Files modified:**
  - `apps/client/app/page.tsx` — Changed "Tests" module card `href` from `/daily-quiz` to `/tests`
  - `apps/client/components/Breadcrumbs.tsx` — Added 6 new route labels (tests, prelims-test-series, prelims-practice-test, mains-test-series, mains-practice-test, ca-prelims)
  - `apps/client/app/globals.css` — Added ~175 lines of `.tests-*` CSS classes (card layout, image placeholder, feature list, hover animations, mobile responsive breakpoints)
- **Design decisions:**
  - Placeholder gradient icons instead of generated images (to be replaced later)
  - Cards use design system tokens (Playfair Display headings, Inter body, navy/orange accents)
  - Mobile: cards stack vertically (image above content) on screens ≤480px
  - No backend changes needed for this phase
- **Verified:** `next build` compiles clean — all 6 new pages render as static content.

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
  - **~524 lines of new CSS** in `globals.css` for `.mains-*` classes (lines 1118–1641).
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

### Session: 2026-05-27 (Resource Module)
- **Who:** AI (Antigravity)
- **What:** Built the complete Resource module from scratch.
- **New files created:**
  - `apps/api/src/models/Resource.ts` — ResourceCategory + ResourceItem Mongoose models
  - `apps/api/src/controllers/resource.controller.ts` — Full CRUD for categories + items (10 functions)
  - `apps/api/src/routes/resource.routes.ts` — 9 routes with multer PDF upload
  - `apps/client/app/resources/page.tsx` — Student accordion page (lazy-load items, tag badges, read/download/share)
  - `apps/client/app/resources/reader/page.tsx` — Suspense wrapper
  - `apps/client/app/resources/reader/PdfViewerClient.tsx` — react-pdf viewer (copied from magazine pattern)
  - `apps/client/app/admin/resources/page.tsx` — Two-tab admin page (Categories + Items), modal forms
- **Files modified (wiring only):**
  - `apps/api/src/routes/index.ts` — added resource routes export
  - `apps/api/src/index.ts` — registered `/api/resources` route
  - `apps/api/src/models/index.ts` — exported ResourceCategory + ResourceItem
  - `apps/client/app/admin/layout.tsx` — added Resources nav item to sidebar
  - `apps/client/components/BottomNav.tsx` — changed Resources link from `/magazines` to `/resources`
  - `apps/client/components/Breadcrumbs.tsx` — added 'resources' route label
- **Design decisions:**
  - Local disk storage for PDFs (same as magazines, not S3)
  - Tag colors handled via inline styles (no new CSS classes needed)
  - Predefined UPSC tags: GS1, GS2, GS3, GS4, Essay, Optional
  - Admin can add custom tags per category
- **Verified:** Backend TypeScript compiles clean. No errors in resource files.

### Session: 2026-05-27 (Resource Item Display Order)
- **Who:** AI (Antigravity)
- **What:** Removed the display order option for resource items in the admin portal (while preserving it for resource categories).
- **Files modified:**
  - `apps/client/app/admin/resources/page.tsx` — Removed the "Display Order" number input field from the Add/Edit Resource item modal form. The "Published" checkbox is now rendered as a single full-width field.
- **Design decisions:**
  - Kept the database schema `order` field to maintain compatibility and prevent database validation errors.
  - Form submission still appends the default `itemOrder` state (default `0` or whatever was loaded on edit) so the backend receives a valid number.
- **Verified:** Both `client` and `api` compile and build successfully.

### Session: 2026-05-27 (Source Hyperlinks: Excel + Clickable Links)
- **Who:** AI (Antigravity)
- **What:** Replaced the article source string field with a mixed type `{ name, url }` object to parse hyperlinks from Excel spreadsheets and render them as clickable links on the user website.
- **Backend changes:**
  - `apps/api/src/models/Article.ts` — Updated the `source` field in `IArticle` interface and schema to use `Schema.Types.Mixed` to accept both legacy strings and new `{ name, url }` objects.
  - `apps/api/src/services/mains-excel.service.ts` — Added `extractHyperlink()` helper which parses cell formulas like `=HYPERLINK("url", "text")` to extract both display name and target URL. Applied this parser to Column E (index 4) for Mains articles.
  - `apps/api/src/services/article-excel.service.ts` — Applied the same `extractHyperlink()` parser to Column G (index 6) for Prelims articles.
- **Admin portal changes:**
  - `new/page.tsx` & `[id]/page.tsx` — Replaced the single "Source" text input with separate "Source Name" and "Source URL" fields in both create and edit forms. On submit, builds the `{ name, url }` structure if a URL is provided, falling back to a string name.
- **Client changes:**
  - `apps/client/lib/api.ts` — Updated the Article type interface.
  - `daily-prelims/page.tsx` & `daily-mains/page.tsx` — Updated both pages to render the source as a clickable link that opens in a new tab when `source.url` is present, or as standard text otherwise.
  - `apps/client/app/globals.css` — Added `.ca-source-link` and `.mains-source-link` hover/underline styles.
- **Verified:** Complete application build (`pnpm run build`) is fully successful.

### Session: 2026-05-27 (User Webpage Bugsheet 3 Fixes)
- **Who:** AI (Antigravity)
- **What:** Fixed 4 "Fail" bugs from `Bugsheet 3(User webpage).csv`
- **Bugs fixed:**
  - **Bug 2 + 4 (DatePicker calendar mispositioning):** Rewrote `DatePicker.tsx` to use an invisible native `<input type="date">` overlaying the styled button instead of `showPicker()`. This ensures the browser positions the calendar popup correctly near the input. Applied same pattern to quiz page's inline date picker.
  - **Bug 6 (PDF download opens in tab instead of downloading):** Simplified `handleDownload` in magazines to always use the server-side download proxy (`/api/magazines/download/:id`) which sets `Content-Disposition: attachment`. Removed the complex multi-fallback approach that could silently fall through to `window.open()`. Fallback now redirects to the proxy URL directly.
  - **Bug 7 (Breadcrumbs invisible on page load):** Added `bg-[#F8FAFC]` background, `relative z-30` positioning to the breadcrumbs nav so they appear above sticky page elements (like magazine tabs at z-20) but below the header (z-50). Reduced top padding from 72px to 68px.
- **Files modified:**
  - `apps/client/components/DatePicker.tsx` — Full rewrite: invisible native input overlay
  - `apps/client/app/daily-quiz/page.tsx` — Replaced `showPicker()` with invisible native input overlay
  - `apps/client/app/magazines/page.tsx` — Simplified download handler to use server proxy
  - `apps/client/components/Breadcrumbs.tsx` — Added background, z-index, adjusted top padding
- **Verified:** TypeScript compiles clean.

### Session: 2026-05-27 (Admin Portal Bugsheet 3 Fixes)
- **Who:** AI (Antigravity)
- **What:** Fixed 10 "Fail" bugs from `Bugsheet 3(Admin Portal Bugsheet).csv`
- **Bugs fixed:**
  - **Bug 1 + 14 (Date validation):** Added `min="2020-01-01"` / `max="2030-12-31"` to all `<input type="date">` across Articles (create/edit), Quizzes (create/edit/import). Also added JS year-range validation (2020–2030) in every `handleSubmit`.
  - **Bug 2, 10, 13, 15 (Title/text character limits):** Added `maxLength={200}` to all title inputs + character counter (`{title.length}/200`). Added `maxLength={100}` to quiz set name inputs.
  - **Bug 8 + 9 (Long title breaks table columns):** 
    - Articles table: `table-layout: fixed`, explicit column widths (35/15/15/20/15%), `truncate` class on title cell with `max-width: 300px`.
    - Magazines table: Same `table-layout: fixed` approach (40/20/15/25%), `truncate` + `min-w-0` on title cell.
  - **Bug 11 (Magazine upload fails on "All Years" tab):** `resetForm()` now defaults `formYear` to `currentYear` instead of `filterYear` (which is `''` when "All Years" is selected), preventing the "required fields" server error.
  - **Bug 12 (Search Clear button visible on empty):** Changed `hasActiveFilters` to only check `searchQuery || dateFilter` (not tab filter). Added inline `✕` clear button inside the search input that appears only when text is entered.
- **Files modified:**
  - `apps/client/app/admin/articles/new/page.tsx` — maxLength on title, min/max on date, date validation
  - `apps/client/app/admin/articles/[id]/page.tsx` — same
  - `apps/client/app/admin/articles/page.tsx` — table-layout fixed, column widths, title truncation, inline search clear
  - `apps/client/app/admin/quizzes/new/page.tsx` — maxLength on title/setName, min/max on date, date validation
  - `apps/client/app/admin/quizzes/[id]/page.tsx` — same
  - `apps/client/app/admin/quizzes/import/page.tsx` — maxLength on title/setName, min/max on date
  - `apps/client/app/admin/magazines/page.tsx` — resetForm year fix, title maxLength, table-layout fixed, title truncation
- **Verified:** TypeScript compiles clean (both API and client). No type errors.

### Session: 2026-05-27 (Landing Page + Current Affairs Route)
- **Who:** AI (Antigravity)
- **What:** Created a new top-level landing page and moved old home page content to `/current-affairs`.
- **New files:**
  - `apps/client/app/page.tsx` (overwritten) — Landing page with hero banner carousel (3 slides, auto-rotate), 5 module navigation cards (Mentorship, Video Courses, Current Affairs, Tests, Resources) with "Free" badges, rotating motivational quotes, toppers testimonials YouTube carousel, announcements list, footer with links + contact FAB
  - `apps/client/app/current-affairs/page.tsx` — Exact copy of old home page content
  - `apps/api/src/scripts/seed-resource-categories.ts` — Seed script for 7 predefined resource categories
- **Files modified:**
  - `apps/client/components/BottomNav.tsx` — Changed Prelims tab → Current Affairs (CA) tab pointing to `/current-affairs`
  - `apps/client/components/Breadcrumbs.tsx` — Added 'current-affairs' route label
- **Seeded data:** 7 resource categories (Standard Text Books, Revision Notes for Prelims/Mains, Mains Value Addition Notes, Prelims/Mains PYQ Solved, Topper Notes) with predefined UPSC tags and accent colors

### Session: 2026-05-27 (Content Rendering: Lists + Tables)
- **Who:** AI (Antigravity)
- **What:** Fixed content rendering for Excel-imported Prelims articles and added full table support.
- **Problem:** Excel content uses `<li level="0">` and `<li level="1">` without wrapping `<ul>` — browsers can't render these as lists.
- **Backend fix:**
  - `article-excel.service.ts` — Added `normalizeListItems()` function that converts bare `<li level="N">` into proper nested `<ul>` structure during import. Also normalizes Additional Info column.
- **Frontend fixes:**
  - `globals.css` — Added: nested sub-list styles (`ul ul li` with outlined bullets), safety-net CSS for legacy `li[level]` attributes, mobile-responsive table (horizontal scroll, smaller font), improved table styling (border-radius, vertical-align).
  - `RichTextRenderer.tsx` — Added TipTap JSON table support: `table`, `tableRow`, `tableHeader`, `tableCell` node types with colspan/rowspan handling.
- **Verified:** All 16 sample rows produce balanced, correctly nested `<ul>` HTML. Backend + client compile clean.
- **Gotcha:** Existing DB content may still have bare `<li level="...">` tags — the CSS safety-net handles this. Re-importing articles will produce proper `<ul>` structure.
- **Mains service update (same session):**
  - `mains-excel.service.ts` — Added same `normalizeListItems()` function. Applied to: `context`, `practice`, `valueAdditions`, Q&A `answer` fields, and the `content` fallback.
  - `globals.css` — Added nested sub-lists, `li[level]` safety-net, mobile table scroll, and table hover/rounded styles to `.mains-rich-content` (mirroring `.article-content` patterns).


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
