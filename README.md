# Modex — Ticket Booking Backend

**Production-ready** ticket booking backend (Node.js + Express + PostgreSQL).  
Supports admin show creation, seat management, concurrent-safe bookings, and auto-expiry of pending bookings.

## ⚙️ Tech stack
- Node.js (18+), TypeScript
- Express
- PostgreSQL (Postgres 15)
- Docker / Docker Compose
- Redis (optional cache / locks)
- pino logger
- SQL migrations (migrations/1_init.sql)

## ✅ Features implemented
- Create shows (with seats)
- List shows and show details (with seat list)
- Book seats (PENDING → CONFIRMED → FAILED), prevents double-booking
- Strong concurrency protection using Postgres transactions + `SELECT ... FOR UPDATE`
- Background expiry worker: auto-fails PENDING bookings older than `EXPIRE_MINUTES` (default 2)
- Dockerized for local development; ready for Render deployment
- Postman collection included (importable)

---

## Quick start (local, recommended)

### Prereqs
- Docker Desktop (Windows/Mac) or Docker Engine + Compose
- Node.js (optional if running locally without Docker)

### 1. Clone & files
Put repository files in a folder `modex-backend/` (you already have this).

### 2. Copy environment file
Create `.env` in project root (or use `.env.example`) with the following:

PORT=3000
NODE_ENV=development
LOG_LEVEL=info

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/modexdb
DB_SSL=false

WORKER_INTERVAL_SECONDS=30
EXPIRE_MINUTES=2

REDIS_URL=redis://redis:6379
JWT_SECRET=f2dcb881-a8e4-4c5d-89fd-78339093edaa81966765-c66f-409d-9d68-65ed3233bea7


> Note: `DATABASE_URL` uses Docker service hostnames when running with `docker compose`.

### 3. Start (Docker Compose)
From project root:
```bash
docker compose up -d --build
