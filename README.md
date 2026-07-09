# PabloSMM

Social Media Marketing panel — grow your social media presence with affordable Instagram, YouTube, Facebook, X, and TikTok services.

## Project Structure

```
pablosmm/
├── apps/
│   ├── web/          Next.js frontend (customer site + admin dashboard)
│   └── api/          Go backend (REST API, auth, SMM provider integration)
├── docs/             Documentation
├── Makefile           Root-level build orchestrator
└── .gitignore
```

## Prerequisites

- **Node.js** ≥ 18
- **Go** ≥ 1.24
- **Make** (GNU Make — install via `choco install make` on Windows, or use Git Bash)

## Quick Start

```bash
# 1. Install web dependencies
make install

# 2. Set up environment files
cp apps/web/.env.example apps/web/.env.local    # Edit with your values
cp apps/api/.env.example apps/api/.env          # Edit with your values

# 3. Start development (frontend + backend)
make dev
```

## Available Commands

Run `make help` to see all targets. Key commands:

| Command | Description |
|---------|-------------|
| `make dev` | Start frontend + backend in parallel |
| `make dev-web` | Start Next.js dev server only |
| `make dev-api` | Start Go backend only |
| `make build` | Build both apps for production |
| `make install` | Install web dependencies (`npm install`) |
| `make lint` | Lint frontend code |
| `make docker-api` | Build API Docker image |
| `make clean` | Clean all build artifacts |

## Backend-Specific Commands

From `apps/api/`:

```bash
make dev       # Run with go run
make build     # Build binary
make migrate   # Run database migrations
make docker    # Build Docker image
```

## Deployment

- **Frontend**: Deployed to [Vercel](https://vercel.com)
- **Backend**: Deployed to [Render](https://render.com)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Zustand |
| Backend | Go 1.24, Chi router, PostgreSQL (Neon) |
| Auth | Google OAuth, JWT |
| Payments | Cryptomus, UPI |
