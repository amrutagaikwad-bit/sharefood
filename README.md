# FoodBridge — Production Food Donation Platform

Full-stack platform connecting food donors with receivers (NGOs, shelters, students, workers) using **free, open-source** technology only.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), Tailwind CSS, React Router, React Leaflet, Socket.io Client |
| Backend | Node.js, Express, Socket.io, JWT, bcrypt |
| Database | SQLite + Prisma ORM |
| Maps | OpenStreetMap + Leaflet + Nominatim geocoding |

## Features

- **Donor flow**: Full donation form, GPS + address, image upload, lifecycle management
- **Receiver flow**: Nearby feed, map, request/reserve/cancel pickups
- **Admin panel**: Users, donations, analytics, moderation, live map, activity logs
- **Real-time**: Socket.io updates for map, feeds, dashboards (no page refresh)
- **Notifications**: Database-backed + live toasts
- **Distance filters**: 1, 3, 5, 10, 25 km (Haversine)
- **Status lifecycle**: Created → Active → Requested → Reserved → Picked Up → Completed → Expired

## Project Structure

```
sharefood/
  backend/          API + Socket.io + Prisma
  frontend/         React SPA
```

## Database upgrade (required after this update)

New fields: `servingsRemaining`, `isPaused`, `isHidden`, audit logs, system logs.

```powershell
cd backend
Remove-Item prisma\dev.db -ErrorAction SilentlyContinue
npx prisma db push
npm run seed
```

---

## One-command start (recommended)

From project root `sharefood/`:

```bash
npm install
npm run dev
```

This starts **backend** (`:5000`) and **frontend** (`:5173`) together.

**Windows PowerShell alternative:**
```powershell
.\scripts\start.ps1
```

### Pickup reminders (free, no email)

On the dashboard, click **Enable pickup reminders (browser)**. FoodBridge uses the browser **Notification API** to alert you about upcoming pickups within the next hour (donors and receivers). No paid email/SMS services.

---

## Setup (from scratch)

### Prerequisites

- Node.js 18+
- npm

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:reset
npm run seed
npm run dev
```

> `prisma:reset` applies migrations and clears DB. Use `npm run prisma:migrate` on existing DB instead.

API: `http://localhost:5000`  
Socket.io: same origin

### 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

App: `http://localhost:5173`

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@foodbridge.com | password123 |
| Donor | donor@foodbridge.com | password123 |
| Receiver | receiver@foodbridge.com | password123 |

## Environment Variables

**backend/.env**
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this-in-production"
PORT=5000
```

**frontend/.env**
```env
VITE_API_URL="http://localhost:5000/api"
VITE_SOCKET_URL="http://localhost:5000"
```

## Deployment (free-friendly)

### Backend (Render / Railway / Fly.io)

1. Set env vars (`DATABASE_URL`, `JWT_SECRET`, `PORT`)
2. Run `npm install && npx prisma migrate deploy && npm run seed`
3. Start with `npm start`
4. Enable WebSocket support on host

### Frontend (Vercel / Netlify)

1. Set `VITE_API_URL` and `VITE_SOCKET_URL` to production API URL
2. `npm run build` → deploy `dist/`

### Production tips

- Use strong `JWT_SECRET`
- Back up SQLite file regularly (or migrate to PostgreSQL by changing Prisma provider)
- Put API behind HTTPS
- Rate-limit auth endpoints

## API Overview

- `POST /api/auth/register` `POST /api/auth/login`
- `GET/POST /api/donations` — public browse with optional auth
- `POST /api/bookings` — create food booking (receiver)
- `GET /api/bookings/mine` — list bookings
- `PATCH /api/bookings/:id/confirm|reject|cancel|complete` — donor/receiver actions
- `POST /api/requests` — legacy alias for bookings
- `PATCH /api/requests/:id/accept|reject|cancel|complete` — legacy alias
- `GET /api/dashboard` — role-based stats
- `GET /api/notifications`
- `GET /api/admin/*` — admin only

## Socket Events

- `donation:created` `donation:updated` `donation:deleted` `donation:expired`
- `request:created` `request:updated`
