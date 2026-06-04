# FoodBridge — Run commands (copy in order)

## Prerequisites
- Node.js 18+ installed
- Open PowerShell in: `C:\Users\amitr\OneDrive\Documents\Desktop\tt\sharefood`

## One-time setup

```powershell
cd "C:\Users\amitr\OneDrive\Documents\Desktop\tt\sharefood"
npm install
npm run setup
```

If database errors occur:

```powershell
cd backend
npm run db:fresh
cd ..
```

## Every time you develop

```powershell
cd "C:\Users\amitr\OneDrive\Documents\Desktop\tt\sharefood"
npm run kill-port
npm run dev
```

## URLs

| Page | URL |
|------|-----|
| Website (frontend) | http://localhost:5173 |
| Find Food map | http://localhost:5173/map |
| Login / Register | http://localhost:5173/auth |
| Donor dashboard | http://localhost:5173/dashboard (login as donor) |
| Create donation | http://localhost:5173/donate/new |
| Admin panel | http://localhost:5173/dashboard (login as admin) |
| API health | http://localhost:5000/api/health/public |

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@foodbridge.com | password123 |
| Donor | donor@foodbridge.com | password123 |
| Receiver | receiver@foodbridge.com | password123 |

## Email OTP (dev)
Without SMTP configured, OTP codes print in the **backend terminal** when you click Send OTP.

Optional SMTP: edit `backend/.env` with `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`.

## Important: `backend/.env`

`DATABASE_URL` must be:

```
DATABASE_URL="file:./dev.db"
```

**Not** `file:./prisma/dev.db` (that breaks auth and data).
