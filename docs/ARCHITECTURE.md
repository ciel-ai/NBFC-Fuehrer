# NBFC Workspace Architecture

## Overview

This repository uses a monorepo architecture powered by **npm workspaces** to manage multiple frontend and backend applications, along with shared libraries. This allows code reuse, consistent dependencies, and a unified developer experience.

## Directory Structure

```text
NBFC/
├── backend/
│   └── business-module/  (NestJS or Express Backend API)
├── frontend/
│   ├── mobile/           (Customer Mobile App - React Native/Expo)
│   ├── web/
│   │   ├── admin/        (Existing Admin Panel - Web)
│   │   ├── customer/     (Customer Portal - Vite/React)
│   │   └── lms/          (LMS Portal - Vite/React)
│   └── shared/           (@nbfc/shared - Shared types, auth, validation, API stubs)
├── docs/                 (Documentation)
└── package.json          (Root Workspace config)
```

## Shared Library (`@nbfc/shared`)

The `frontend/shared` directory is a local npm package named `@nbfc/shared`. It acts as the single source of truth for:
- **Models**: TypeScript interfaces representing the domain (e.g., `User`, `Loan`, `Payment`).
- **Validation**: Zod schemas for validating forms and API payloads.
- **Auth**: RBAC (Role-Based Access Control) configuration and permission definitions.
- **Constants**: Application-wide constants like enums, status codes, and configuration values.
- **API**: Shared fetch functions or Axios instances and request/response types.

### Important Constraint
The shared library only contains pure TypeScript and logic. It **does not** contain UI components (like React DOM or React Native elements) to ensure compatibility across both web and mobile environments.

## Frontend Portals

1. **Admin Panel** (`frontend/web/admin`): The internal portal for managing operations, reviewing loan applications, and system administration. Uses RBAC for access control.
2. **Customer Portal** (`frontend/web/customer`): A web application for customers to view their loan status, make payments, and manage their profile.
3. **LMS Portal** (`frontend/web/lms`): The Loan Management System portal for loan officers and agents to process and originate loans.
4. **Mobile App** (`frontend/mobile`): A React Native/Expo application for customers providing the same features as the customer web portal in a native experience.

## Backend

The `backend/` directory houses the core business services that expose REST or GraphQL APIs consumed by the frontend applications. It interacts with the primary database.
