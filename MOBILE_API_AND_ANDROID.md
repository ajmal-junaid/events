# Project Identification + Android/API Plan

## Current Project (Identified)

- **Project name:** Rental Management System
- **Web stack:** Next.js App Router + TypeScript
- **Database:** MongoDB via Prisma
- **Auth (web):** NextAuth Credentials + JWT session strategy
- **Core domains:** Branches, Users, Customers, Products, Inventory, Orders, Payments, Notifications
- **Primary web modules:** Dashboard, Orders, Customers, Products, Users, Branches, Settings/Profile

## Mobile API Added

These API routes are now available for Android integration:

- `POST /api/mobile/auth/login`
- `GET /api/mobile/branding`
- `GET /api/mobile/me`
- `GET /api/mobile/dashboard/stats`
- `GET /api/mobile/branches`
- `GET /api/mobile/customers`
- `POST /api/mobile/customers`
- `GET /api/mobile/products`
- `GET /api/mobile/orders`
- `POST /api/mobile/orders`

## Authentication for Android

1. Call `POST /api/mobile/auth/login` with:

```json
{
  "email": "admin@rental.com",
  "password": "admin123"
}
```

2. Save returned `token` securely on device.
3. Send token in all other requests:

```
Authorization: Bearer <token>
```

## Suggested Android Architecture

- Kotlin + Jetpack Compose UI
- MVVM + Repository pattern
- Retrofit + OkHttp for network
- Kotlinx Serialization or Moshi/Gson for JSON
- Secure token storage using encrypted preferences

## Recommended Delivery Phases

1. **Phase 1:** Login + dashboard stats + list screens (branches/customers/products/orders)
2. **Phase 2:** Create customer + create order flows
3. **Phase 3:** Offline caching + sync, notifications, invoice PDF sharing
