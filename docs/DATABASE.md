# FoodBridge Database

FoodBridge uses **Prisma ORM** with **SQLite** for local development. All data is persisted in `backend/prisma/dev.db` — not browser localStorage (only the JWT auth token is stored in the browser).

## Models

| Model | Purpose |
|-------|---------|
| User | Donors, receivers, admins |
| Donation | Food listings with location & servings |
| Request | Food **bookings** (userId, donationId, peopleToServe, bookingDateTime, status) |
| Notification | In-app notifications |
| ActivityLog / AdminLog / SystemLog | Monitoring & audit |
| SiteSetting | Website configuration |

## Booking statuses

Stored in `Request.status`, shown in the API as:

| API label | Database values |
|-----------|-----------------|
| Pending | `PENDING` |
| Confirmed | `CONFIRMED`, `ACCEPTED`, `RESERVED` |
| Completed | `COMPLETED` |
| Cancelled | `CANCELLED`, `REJECTED` |

## Setup

```powershell
cd backend
copy .env.example .env
npx prisma generate
npx prisma migrate deploy
npx prisma db push
npm run seed
```

From project root: `npm run setup`

## Production (PostgreSQL / MongoDB)

- **PostgreSQL**: Change `provider` in `schema.prisma` to `postgresql` and set `DATABASE_URL`.
- **MongoDB**: Would require a separate Mongoose layer; the current app is built on Prisma relational models. For MongoDB Atlas, plan a dedicated migration project.
