# FoodBridge - Food Donation and Sharing Platform

FoodBridge is a full-stack web application that connects food donors with receivers nearby.
It focuses on reducing food waste, supporting communities, and enabling quick local coordination.

## Tech Stack

- Frontend: React (Vite), React Router, Tailwind CSS, React Leaflet, Lucide React
- Backend: Node.js, Express.js, JWT, bcrypt
- Database: SQLite + Prisma ORM
- Maps & Location: OpenStreetMap, Leaflet, Browser Geolocation API

## Project Structure

```text
FoodBridge/
  backend/
  frontend/
```

## Features

- Role-based authentication (Donor / Receiver)
- Donation creation with image URL, expiry, pickup instructions, and geolocation
- Nearby donation discovery with Haversine distance sorting
- Interactive map with donation markers and range highlights (1km, 5km, 10km)
- Request pickup flow and status tracking
- Donor and receiver dashboards
- Search, category filtering, dark mode, and responsive UI
- Local in-app notifications (no paid services)

## Quick Start

### 1) Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Backend runs on `http://localhost:5000`.

### 2) Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment Variables

### backend/.env

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-strong-secret"
PORT=5000
```

### frontend/.env

```env
VITE_API_URL="http://localhost:5000/api"
```

## Production Notes

- Use HTTPS and secure cookie strategy behind reverse proxy
- Rotate JWT secrets and set strong values
- Keep SQLite in protected directory with backups
- Serve frontend build with Nginx or static hosting

