# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # development server at localhost:3000
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
pnpm format       # Prettier (write)
pnpm format:check # Prettier (check only)
pnpm commit       # commitizen interactive commit
```

### Database (Neon + Prisma)

```bash
pnpm db:migrate                      # create + apply a migration in dev
pnpm db:generate                     # regenerate the client into src/generated/prisma
pnpm db:seed                         # load the municipal seed data
pnpm db:studio                       # browse the data
```

Two connection strings are required. `DATABASE_URL` is Neon's **pooled** endpoint and is what
the app uses at runtime (`src/lib/prisma.ts`). `DIRECT_URL` is the **unpooled** endpoint and is
what `prisma.config.ts` hands to the CLI — the migration engine emits statements PgBouncer
cannot proxy. `docker-compose.yml` is still there if you prefer local Postgres; point both
variables at it.

After editing `src/lib/auth.ts` (Better Auth config), regenerate the auth models into the schema before migrating:

```bash
npx @better-auth/cli generate --config src/lib/auth.ts --output prisma/schema.prisma -y
```

Copy `.env.example` to `.env` and fill in the values before running anything that touches the DB or auth.

## Commits

Use `pnpm commit` instead of `git commit`. Husky enforces:

- **pre-commit**: Prettier check must pass
- **commit-msg**: commitlint validates conventional commit format (`type(scope): description`)

Scopes are optional. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`.

## Stack

- **Next.js 16** with App Router and React 19
- **Tailwind CSS v4** — no `tailwind.config.js`, configuration lives in `globals.css` via `@theme inline`
- **shadcn** (radix-nova style) — add components with `pnpm dlx shadcn@latest add <component>`. Note: the DGRD screens do not use shadcn; they use the design system ported from the mockup (see below)
- **TypeScript** strict mode, path alias `@/*` maps to `src/*`
- **PostgreSQL + Prisma 7** — driver adapter (`@prisma/adapter-pg`); the client is generated to `src/generated/prisma` (gitignored)
- **Better Auth** — email/password only (no Google), with the `admin` plugin
- **TanStack Query** — async client state, wired in `src/providers/`

## Architecture

App Router structure under `src/app/`. Authenticated screens live under the `(app)` route group,
whose layout guards the session and loads the whole domain once via `loadAppData()`. Server
Components by default — add `"use client"` only when needed (event handlers, hooks, browser APIs).

**Styling.** The DGRD screens use the design system ported verbatim from the mockup, in
`src/app/dgrd.css` (plain CSS, BEM-ish class names like `.panel`, `.table`, `.subrow`). Its
tokens live on `.dgrd` (applied to `<body>`), not `:root`, because `--muted` and `--ring` would
otherwise clash with the shadcn semantic tokens in `globals.css`. shadcn components in
`src/components/ui/` are unused by these screens and would render with the wrong tokens inside
`.dgrd`.

Shared UI primitives (Modal, Badge, Field, DrawerShell, toasts…) are in `src/components/kit/`,
icons in `src/components/icons.tsx`, and the per-module screens in `src/components/views/`.
Shared logic in `src/lib/`. The `cn()` utility from `src/lib/utils.ts` merges Tailwind classes.

### Data & auth

- **Prisma client** is a global singleton in `src/lib/prisma.ts` (avoids exhausting connections during dev hot-reload). Import it as the default export. Note the generated client lives at `src/generated/prisma/client` and is imported there via a relative path (the `@/` alias is not resolvable by Prisma/Better Auth CLIs).
- **Better Auth** is configured in `src/lib/auth.ts` (server) and consumed in the browser via `src/lib/auth-client.ts`. The HTTP handler is `src/app/api/auth/[...all]/route.ts`. Use Better Auth's own client hooks (`useSession`, etc.) for auth state — keep TanStack Query for application data.
- **Server access.** Reads go through `loadAppData()` in `src/server/data.ts`, which translates the
  English schema into the Spanish DTOs the ported views expect (`src/lib/types.ts`). Writes are
  server actions in `src/server/actions/`, each wrapped in `run()` so failures come back as
  `{ ok: false, error }` instead of throwing into the client, and each revalidating the layout.
- **Roles:** the `admin` plugin owns `role` (admin/regular) and `banned` (active/inactive). Admins manage accounts (create, ban/unban); all non-admin users share the same permissions, so there is no per-user granular permission model. `regular` is declared through access control in `src/lib/auth.ts` — the plugin's default set is only `user`/`admin`.
- **Domain restriction:** sign-up is limited to the institutional domain via `databaseHooks.user.create.before` in `src/lib/auth.ts`, configurable through `ALLOWED_EMAIL_DOMAIN`. Leave it empty to disable the restriction.
- **Evidence files:** activity attachments are stored on disk under `EVIDENCE_DIR`, outside `public/`, and served by `/api/evidencia/[id]` behind a session check. `src/server/storage.ts` is the only place that touches the filesystem — swap it for S3 without changing anything else.
