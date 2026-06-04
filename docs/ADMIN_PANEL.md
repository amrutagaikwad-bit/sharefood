# Enterprise Admin Control Panel

## Access

| URL | Roles |
|-----|-------|
| http://localhost:5173/admin | `ADMIN`, `SUPER_ADMIN` |

### Accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@foodbridge.com | password123 |
| Super Admin | superadmin@foodbridge.com | password123 |

## Features

### Overview dashboard
Real-time cards: users, donations, bookings, food distributed, notifications, daily activity, online users, revenue (placeholder).

### User management
Search, filter, suspend, ban, delete, reset password, change role (Donor/Receiver), profile with activity + login history + IP/device from sessions.

### Live user tracking
Socket.IO presence: current page, browser, device, session duration, IP.

### Donations & bookings
Approve, reject, delete donations; approve/cancel bookings.

### Activity logs
Searchable audit trail, system errors, admin actions. Export CSV/JSON.

### Performance
Server uptime, DB latency, API response times, error rate, CPU load, traffic charts.

### Security
Failed logins, bans, security event log.

### Database
Table counts, backup/restore SQLite file, export CSV/JSON.

### Settings
Site name, contact, OTP, notifications (via `SiteSetting` key-value store).

### Analytics
User/donation/booking growth (daily/weekly/monthly), geographic usage from donation cities.

## API base

All routes require `Authorization: Bearer <token>` and admin role.

- `GET /api/admin/dashboard` — full overview
- `GET /api/admin/live/users` — online users + sessions
- `GET /api/admin/users` — list (query: `q`, `role`, `status`)
- `GET /api/admin/users/:id` — profile + history
- `PATCH /api/admin/users/:id/role` — body: `{ role: "DONOR"|"RECEIVER" }`
- `GET /api/admin/export/:type?format=csv|json` — users, donations, bookings, logs
- `POST /api/admin/database/backup` — create `.db` backup
- `POST /api/admin/database/restore` — body: `{ file: "dev-123.db" }`

## Stack note

This project uses **SQLite + Prisma + Express** (persistent, production-ready for small/medium deployments). APIs are designed like MongoDB collection stats for easy future migration.

## Reports (PDF)

Use `GET /api/admin/reports/:type` then browser **Print → Save as PDF**, or export CSV and open in Excel.
