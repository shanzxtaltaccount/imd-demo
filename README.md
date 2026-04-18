# IMD Store Log System

A secure, production-grade digital purchase logbook for the Indian Meteorological Department.
Built with Next.js 14 (App Router), Prisma, PostgreSQL (Neon), and deployed on Vercel.

---

## Architecture Overview

```
src/
├── app/
│   ├── (auth)/login/           # Login page (no sidebar)
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar layout (server, checks session)
│   │   ├── entries/page.tsx    # Main logbook (client component)
│   │   └── analytics/page.tsx  # Analytics dashboard (client component)
│   ├── api/
│   │   ├── auth/login/         # POST - login, sets HTTP-only cookie
│   │   ├── auth/logout/        # POST - clears cookie
│   │   ├── entries/            # GET (list+filter), POST (create)
│   │   ├── entries/[id]/       # GET, PATCH, DELETE (soft)
│   │   ├── analytics/          # GET - aggregate stats
│   │   └── users/seed/         # POST - create users (disable in prod)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Redirects → /entries or /login
├── components/
│   ├── ui/
│   │   ├── Sidebar.tsx         # Nav + logout
│   │   ├── Toast.tsx           # Toast notification context
│   │   ├── ConfirmDialog.tsx   # Delete confirmation modal
│   │   └── CategoryBadge.tsx   # Coloured category pill
│   └── entries/
│       ├── EntryFormModal.tsx  # Create/edit modal
│       └── EntryDetailModal.tsx# View full entry
├── lib/
│   ├── prisma.ts               # Prisma singleton
│   ├── auth.ts                 # JWT sign/verify (jose, Edge-compatible)
│   ├── validations.ts          # Zod schemas
│   ├── api.ts                  # Response helpers + rate limiter
│   └── format.ts               # INR formatter, date helpers
├── middleware.ts               # Route protection + user header injection
prisma/
├── schema.prisma
└── seed.ts
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| `jose` for JWT | Edge-compatible (works in Next.js Middleware). `jsonwebtoken` uses Node crypto, which is unavailable at the Edge. |
| HTTP-only cookies | Prevents XSS token theft. `sameSite: lax` blocks CSRF for state-changing requests. |
| Prisma `Decimal` for prices | Avoids IEEE 754 float errors. Money never stored as float. |
| Soft delete only | Audit trail. `is_deleted` + index ensures deleted rows don't appear in queries without full-table scans. |
| `Promise.all` in analytics | Parallel DB queries — analytics page fires 7 queries concurrently instead of sequentially. |
| Server components for layout | Session read happens on server; no client-side token exposure. |
| Debounced search (350ms) | Prevents a DB query on every keystroke. |
| In-memory rate limiter | Sufficient for 4–5 users. If Vercel scales to multiple instances, swap for Redis (Upstash). |

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (free tier is fine)
- A [Vercel](https://vercel.com) account

---

### Step 1 — Clone & Install

```bash
git clone <your-repo>
cd imd-store-log
npm install
```

---

### Step 2 — Environment Variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# From Neon dashboard → Connection Details → Pooled connection string
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"

# From Neon dashboard → Connection Details → Direct connection string
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"

# Generate a strong secret:
# openssl rand -base64 64
JWT_SECRET="your-64-char-secret-here"

COOKIE_NAME="imd_session"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Why two URLs?**
> `DATABASE_URL` uses the pooled endpoint (PgBouncer) — required for Vercel serverless functions which open many short-lived connections. `DIRECT_URL` bypasses the pool and is required for Prisma migrations.

---

### Step 3 — Database Setup

```bash
# Push schema to Neon (creates tables)
npm run db:push

# Or use migrations (recommended for production)
npm run db:migrate
```

---

### Step 4 — Create Initial Users

```bash
npm run db:seed
```

This creates:

| Email | Password | Role |
|---|---|---|
| admin@imd.gov.in | Admin@IMD2024 | ADMIN |
| store.officer@imd.gov.in | Store@2024 | STAFF |
| assistant@imd.gov.in | Asst@2024 | STAFF |

> ⚠️ **Change all passwords immediately after first login.**

Alternatively, use the seed API (only works when `NODE_ENV !== production` or `SETUP_TOKEN` is set):

```bash
curl -X POST http://localhost:3000/api/users/seed \
  -H "Content-Type: application/json" \
  -d '{"email":"user@imd.gov.in","name":"User Name","password":"SecurePass123","role":"STAFF"}'
```

---

### Step 5 — Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

### Step 6 — Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

Prisma generates the client automatically during build (`prisma generate && next build`).

---

## Security Checklist

- [x] Passwords hashed with bcrypt (cost factor 12)
- [x] JWT in HTTP-only, Secure, SameSite=Lax cookies
- [x] All inputs validated with Zod (server-side)
- [x] Prisma parameterized queries (no SQL injection)
- [x] All API routes protected by middleware
- [x] Rate limiting on login endpoint (5 req/min/IP)
- [x] Timing-safe password comparison (prevents user enumeration)
- [x] Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- [x] Soft delete only (no data loss)
- [x] Total price calculated server-side (never trusted from client)
- [ ] Change default seed passwords before go-live
- [ ] Set `SETUP_TOKEN` or remove `/api/users/seed` route after setup
- [ ] Enable Neon IP allowlisting for production

---

## Adding a New User (Post-Deploy)

Since there's no UI for user management (intentional — small team), use Prisma Studio or the seed API:

```bash
# Via Prisma Studio
npm run db:studio

# Or via seed API (requires SETUP_TOKEN env var in production)
curl -X POST https://your-app.vercel.app/api/users/seed \
  -H "Content-Type: application/json" \
  -d '{"setupToken":"your-token","email":"new@imd.gov.in","name":"New User","password":"Secure@2024","role":"STAFF"}'
```

---

## Common Issues

**"PrismaClientInitializationError" on Vercel**
→ Ensure `DATABASE_URL` uses the pooled connection string with `?pgbouncer=true`.

**Migrations fail locally**
→ Use `DIRECT_URL` (non-pooled) for `npm run db:migrate`.

**Cookie not set after login**
→ In development, `secure` is `false`. In production on Vercel (HTTPS), it will work correctly.

**"Cannot find module 'bcryptjs'"**
→ Run `npm install`.
