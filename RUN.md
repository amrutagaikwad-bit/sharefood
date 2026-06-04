# FoodBridge — How to run

## Prerequisites
- **Node.js 18+** ([nodejs.org](https://nodejs.org))
- Open **PowerShell** in the project folder:

```text
C:\Users\amitr\OneDrive\Documents\Desktop\tt\sharefood
```

> Run all commands from **`sharefood`**, not the parent `tt` folder.

---

## First-time setup (once)

```powershell
cd "C:\Users\amitr\OneDrive\Documents\Desktop\tt\sharefood"
npm install
npm run setup
```

If you see database / migration errors:

```powershell
cd backend
npm run db:fresh
cd ..
```

---

## Start the app (every time)

```powershell
cd "C:\Users\amitr\OneDrive\Documents\Desktop\tt\sharefood"
npm run kill-port
npm run dev
```

Wait until you see:
- Backend: `Server running on port 5000`
- Frontend: `Local: http://localhost:5173`

Press **Ctrl+C** to stop both servers.

---

## URLs

| What | URL |
|------|-----|
| Home | http://localhost:5173 |
| Login / Register | http://localhost:5173/auth |
| Find Food (map) | http://localhost:5173/map |
| Donation details / book | http://localhost:5173/donations/:id |
| Donor dashboard | http://localhost:5173/dashboard (as donor) |
| Receiver dashboard | http://localhost:5173/dashboard (as receiver) |
| **Enterprise Admin** | http://localhost:5173/admin |
| Create donation | http://localhost:5173/donate/new |
| API health | http://localhost:5000/api/health/public |

---

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@foodbridge.com | password123 |
| Super Admin | superadmin@foodbridge.com | password123 |
| Donor | donor@foodbridge.com | password123 |
| Receiver | receiver@foodbridge.com | password123 |

---

## Food booking flow

1. Log in as **receiver** → open **Find Food** or a donation page.
2. Use **Book food** (people to serve + pickup time).
3. Log in as **donor** → **Dashboard** → **Confirm** or **Reject** pending bookings.
4. Either party can **Complete** or **Cancel** when appropriate.
5. Notifications appear in-app; OTP codes print in the backend terminal if SMTP is not set.

API aliases: `/api/bookings` and `/api/requests` (same handlers).

---

## Database (`backend/.env`)

SQLite file (persistent, not browser storage):

```env
DATABASE_URL="file:./dev.db"
```

**Wrong:** `file:./prisma/dev.db` — breaks auth and data.

Optional email OTP (otherwise OTP prints in backend console):

```env
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ENOENT package.json` | `cd` into `sharefood` first |
| Port 5000 in use | `npm run kill-port` then `npm run dev` |
| Auth / empty DB | Check `DATABASE_URL`, run `cd backend && npm run db:fresh` |
| Prisma EPERM (OneDrive) | Pause OneDrive sync or move project off OneDrive |

---

## Run backend or frontend only

```powershell
npm run dev:backend   # API only — port 5000
npm run dev:frontend  # UI only — port 5173
```
