
# Modex — Movie Show Booking (Project Documentation)

## 1. Project overview
Modex is a compact full-stack web application for managing movie shows and seat bookings. It includes a TypeScript Node.js backend, PostgreSQL, Redis, and a React + Vite frontend. The backend also serves the built frontend as static files so everything runs from a single URL.

Live public deployment: https://cine-flow-31ffef55.base44.app/

## 2. Key features
- List available shows
- Add new shows
- Create seat bookings
- View booking details
- SPA frontend served from backend
- Full Dockerized environment

## 3. Architecture
- React/Vite frontend
- Node.js/Express backend (TypeScript)
- PostgreSQL database
- Redis optional cache
- Docker Compose runtime

## 4. Local Setup (Short)
```
npm run build
docker compose build --no-cache
docker compose up -d
```
Frontend at: http://localhost:3000  
APIs at: http://localhost:3000/api/*  

## 5. Environment variables
- PORT
- DATABASE_URL
- REDIS_URL
- NODE_ENV
- LOG_LEVEL

## 6. Database
Includes tables for shows and bookings. Migration file: migrations/1_init.sql.

## 7. Frontend–Backend Integration
- React build copied into backend/public
- Express serves static files
- SPA fallback to index.html

## 8. Troubleshooting
- 404 root → missing public folder in image
- DB errors → incorrect DATABASE_URL
- Use curl.exe on Windows

## 9. Project Status
Fully functional API + frontend + Docker deployment. Remaining optional improvements include testing and caching optimizations.
