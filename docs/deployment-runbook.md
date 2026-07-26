# Deployment Runbook

## 1. Required Environment Variables

### Frontend (`.env.local`)

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `VITE_CONVEX_SITE_URL`
- `VITE_ESEWA_MERCHANT_CODE` (optional for local adapter checks)
- `VITE_ESEWA_SECRET_KEY` (optional for local adapter checks)
- `VITE_KHALTI_PUBLIC_KEY` (optional for local adapter checks)
- `VITE_KHALTI_SECRET_KEY` (optional for local adapter checks)

### Convex Dashboard Environment Variables

- `CLERK_JWT_ISSUER_DOMAIN`
- `ESEWA_MERCHANT_CODE`
- `ESEWA_SECRET_KEY`
- `KHALTI_PUBLIC_KEY`
- `KHALTI_SECRET_KEY`
- `ESEWA_SANDBOX_URL` (optional)
- `KHALTI_SANDBOX_URL` (optional)

## 2. Build and Validation

1. `npx convex codegen`
2. `pnpm test`
3. `pnpm build`

## 3. Database Seed

After creating an admin user in the app, seed demo content:

- Run Convex function: `seed.seedDemoContent`

This seeds:

- Financing options
- News entries

## 4. Webhook Setup

Configure payment provider webhooks to Convex HTTP endpoints:

- `POST /payments/esewa/webhook`
- `POST /payments/khalti/webhook`

Base URL format:

- `https://<your-convex-site>.convex.site`

Example:

- `https://amicable-panther-413.convex.site/payments/esewa/webhook`

## 5. Post-Deploy Smoke Checks

1. Sign up with Clerk and verify profile is created in `users` table.
2. Submit seller listing and verify admin approval path.
3. Create transaction and verify checkout block behavior when gateway vars are missing.
4. Trigger webhook payload and verify transaction status changes.
5. Verify generated legal documents are available for buyer and seller.
