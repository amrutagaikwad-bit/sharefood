# Website Host Panel (Super Admin)

Access: login as **admin@foodbridge.com** / **password123** → **Dashboard** (full-screen Host Panel).

## Sections

| Section | Features |
|---------|----------|
| Overview | KPI cards, trends chart, health |
| Live | Online users, live bookings/donations |
| Users | Search, filter, profile, login history, ban/unban, reset password, delete |
| Donations | Approve, reject, delete |
| Bookings | Search, admin approve/cancel/complete |
| Analytics | Daily / weekly / monthly stats |
| Performance | Uptime, DB latency, API response times |
| Activity Logs | Searchable audit trail |
| Notifications | Platform alerts |
| Security | Failed logins, security events |
| Database | Table counts, backup |
| Reports | CSV export (users, donations, bookings) |
| Settings | Site configuration keys |

## API (`/api/admin/host/*`)

All routes require `Authorization: Bearer <admin JWT>`.

- `GET /overview` — dashboard metrics
- `GET /live` — real-time snapshot
- `GET /users`, `GET /users/:id`
- `PATCH /users/:id/ban`, `/unban`
- `POST /users/:id/reset-password`
- `GET /activity?q=&action=`
- `GET /security`, `/notifications`, `/database`
- `POST /database/backup`
- `GET /export/:type.csv` — users | donations | bookings
- `PATCH /bookings/:id/approve|cancel|complete`

Legacy `/api/admin/*` routes remain unchanged.
