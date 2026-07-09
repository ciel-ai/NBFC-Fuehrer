# NBFC API Specification

This document outlines the core RESTful endpoints provided by the `business-module` backend and consumed by the frontend applications.

## Base URL
- Development: `http://localhost:3000/api/v1`
- Production: `https://api.nbfc-domain.com/v1`

## Authentication

All secured endpoints require a Bearer token in the Authorization header.
```
Authorization: Bearer <JWT_TOKEN>
```

### Endpoints

- `POST /auth/login`
  - Body: `{ email, password }`
  - Returns: `{ user, token }`
- `POST /auth/register`
  - Body: `{ email, password, role }`
  - Returns: `{ user, token }`
- `GET /auth/me`
  - Returns: `{ user }`

## Users

- `GET /users` (Admin only)
  - Returns: `List<User>`
- `GET /users/:id`
  - Returns: `User`
- `PATCH /users/:id`
  - Body: `{ ...user_updates }`
  - Returns: `User`

## Loans

- `POST /loans/apply`
  - Body: `{ amount, tenure, purpose }`
  - Returns: `Loan` (status: PENDING)
- `GET /loans` (Admin/LMS: All, Customer: Own loans)
  - Returns: `List<Loan>`
- `GET /loans/:id`
  - Returns: `Loan`
- `PATCH /loans/:id/status` (Admin/LMS only)
  - Body: `{ status: 'APPROVED' | 'REJECTED', comments: string }`
  - Returns: `Loan`

## Payments

- `POST /payments/initiate`
  - Body: `{ loanId, amount, paymentMethod }`
  - Returns: `{ paymentId, paymentGatewayUrl }`
- `GET /payments` (Admin: All, Customer: Own)
  - Returns: `List<Payment>`
- `GET /payments/:id/status`
  - Returns: `PaymentStatus`

## Types & Validation
Refer to `@nbfc/shared` in the `frontend/shared` directory for exact TypeScript definitions (`models/`) and Zod validation schemas (`validation/`) used across all endpoints.
