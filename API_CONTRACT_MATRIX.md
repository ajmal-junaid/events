# API Contract Matrix

This document maps active client calls to API routes, with expected request/response contracts.

## How to use

- Before changing any route payload or response, update this matrix first.
- If a field changes server-side, update the corresponding client schema/parser in the same PR.
- Validate with:
  - `mobile-app`: `npm run typecheck`
  - `rental-system`: `npx tsc --noEmit && npm run build`

---

## Mobile App -> `/api/mobile/*`

| Client file | Method | Endpoint | Request contract | Response contract |
|---|---|---|---|---|
| `mobile-app/src/features/auth/api.ts` | POST | `/api/mobile/auth/login` | `{ email, password }` | `{ token, accessToken, refreshToken, user }` |
| same | POST | `/api/mobile/auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| same | POST | `/api/mobile/auth/forgot-password/request` | `{ email }` | `{ message }` |
| same | POST | `/api/mobile/auth/forgot-password/reset` | `{ email, code, newPassword }` (min 8) | `{ message }` |
| same | GET | `/api/mobile/me` | bearer token | `{ id, name, email, role, branchId, branch }` |
| `mobile-app/src/features/auth/branding-api.ts` | GET | `/api/mobile/branding` | none | branding payload (logo/name fields) |
| `mobile-app/src/features/dashboard/api.ts` | GET | `/api/mobile/dashboard/stats` | bearer token | dashboard stats + `recentSales` |
| `mobile-app/src/features/orders/api.ts` | GET | `/api/mobile/orders` | optional query: `branchId`, `cursor`, `limit` | `{ items, nextCursor, hasMore }` |
| same | GET | `/api/mobile/orders/:id` | path param `id` | order detail with items/payments/customer/branch |
| same | POST | `/api/mobile/orders` | order create payload (`customerId`, `branchId`, dates, items, totals/payment fields) | created order |
| same | PATCH | `/api/mobile/orders/:id` | `{ status }` | updated order |
| same | GET | `/api/mobile/orders/:id/invoice-token` | path param `id` | `{ token, expiresInSeconds }` |
| same | POST | `/api/mobile/payments` | `{ orderId, amount>=1, method }`, header `Idempotency-Key` | created payment |
| `mobile-app/src/features/customers/api.ts` | GET | `/api/mobile/customers` | optional `search` | customer list |
| same | POST | `/api/mobile/customers` | `{ name, phone, address?, notes? }` | created customer |
| same | GET | `/api/mobile/customers/:id` | path param `id` | customer detail + summary + scoped orders |
| `mobile-app/src/features/branches/api.ts` | GET | `/api/mobile/branches` | none | branch list |
| same | POST | `/api/mobile/branches` | `{ name, address, phone, logo? }` | created branch |
| same | PUT | `/api/mobile/branches/:id` | `{ name, address, phone, logo? }` | updated branch |
| same | DELETE | `/api/mobile/branches/:id` | path param `id` | delete result |
| same | GET | `/api/mobile/branches/:id` | path param `id` | branch detail + summary |
| `mobile-app/src/features/users/api.ts` | GET | `/api/mobile/users` | optional `cursor`, `limit` | `{ items, nextCursor, hasMore }` |
| same | POST | `/api/mobile/users` | `{ name, email, password(min 8), role, branchId? }` | created user |
| `mobile-app/src/features/products/api.ts` | GET | `/api/mobile/products` | optional `search` | product list |
| same | POST | `/api/mobile/products` | `{ name, category, basePrice, totalStock, image? }` | created product |
| same | PUT | `/api/mobile/products/:id` | product update payload | updated product |
| same | DELETE | `/api/mobile/products/:id` | path param `id` | delete result |
| same | POST | `/api/mobile/upload` | `multipart/form-data` with `file` | `{ url, ...metadata }` |
| `mobile-app/src/features/inventory/api.ts` | GET | `/api/mobile/inventory` | optional `branchId` | inventory rows |
| same | POST | `/api/mobile/inventory` | `{ branchId, productId, quantity }` | updated inventory |
| same | GET | `/api/mobile/inventory/availability` | `branchId`, `startDate`, `endDate` | product availability rows |

### Guardrail (mobile)

- `mobile-app/src/core/network/http-client.ts` blocks accidental non-mobile API calls:
  - allows `/api/mobile/*`
  - rejects `/api/*` if not mobile namespace

---

## Web App -> `/api/*` and `/api/public/*`

| Client area | Method | Endpoint | Request contract | Response contract |
|---|---|---|---|---|
| Dashboard overview | GET | `/api/dashboard/stats` | none | stats + chart + recent orders |
| Orders create page | GET | `/api/inventory/availability` | `branchId`, `startDate`, `endDate` | availability rows |
| Orders create page | POST | `/api/orders` | order payload (server recomputes totals) | created order |
| Order detail page | PATCH | `/api/orders/:orderId` | `{ status }` | updated order |
| Payment form | POST | `/api/payments` | `{ orderId, amount>=1, method }`, optional `Idempotency-Key` | created payment |
| Branch form/list actions | POST/PUT/DELETE | `/api/branches`, `/api/branches/:id` | branch payload | branch result |
| Customer form/list actions | POST/PUT/DELETE | `/api/customers`, `/api/customers/:id` | customer payload | customer result |
| Product form/list actions | POST/PUT/DELETE | `/api/products`, `/api/products/:id` | product payload | product result |
| Inventory form | POST | `/api/inventory` | inventory payload | inventory result |
| User form/list actions | POST/PUT/DELETE | `/api/users`, `/api/users/:id` | user payload | user result |
| Settings password | PUT | `/api/users/:id/password` | `{ currentPassword, newPassword }` | success message |
| Settings profile | PUT | `/api/users/:id` | self-update supports `{ name, email }` | updated user |
| Product image upload | POST | `/api/upload` | `multipart/form-data` `file` | `{ url, ... }` |
| Enquiries admin list | GET | `/api/enquiries` | none | enquiry list |
| Enquiries admin update | PATCH | `/api/enquiries/:id` | admin update payload | updated enquiry |
| Enquiries convert | POST | `/api/enquiries/:id/convert-order` | empty body | `{ orderId }` |
| Password resets admin | PATCH | `/api/password-resets/:id` | none | updated notification |
| Public enquiry page | GET | `/api/public/branches` | none | branch list |
| Public enquiry page | GET | `/api/public/inventory/availability` | `branchId`, `startDate`, `endDate` | availability rows |
| Public enquiry page | POST | `/api/public/enquiries` | public enquiry payload | created enquiry |

---

## Current contract rules (must stay aligned)

- Password policy: user create/reset requires minimum 8 chars.
- Payments: `amount` must be `>= 1`.
- Mobile must call only `/api/mobile/*` for app data APIs.
- Server remains authoritative for order totals/pricing and availability checks.
- Payment endpoints use idempotency support when `Idempotency-Key` is supplied.
