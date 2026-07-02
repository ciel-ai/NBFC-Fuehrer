# NBFC Workspace

This repository is a monorepo containing the core systems for the NBFC platform. It leverages **npm workspaces** to manage multiple interrelated projects.

## Project Structure

- `frontend/shared` (`@nbfc/shared`): Shared business logic, types, and validations.
- `frontend/web/admin`: React Admin Panel (Vite/React).
- `frontend/web/customer`: Customer Web Portal (Vite/React).
- `frontend/web/lms`: Loan Management System (Vite/React).
- `frontend/mobile`: Customer Mobile App (React Native/Expo).
- `backend/business-module`: Core API Services.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v8+)

### Installation

To install all dependencies across all projects, run the following command in the root directory:
```bash
npm install
```

### Running Applications

You can start individual applications using the `npm run` command with the `--workspace` flag.

**Backend API:**
```bash
npm run start --workspace=backend/business-module
# OR for development
npm run dev --workspace=backend/business-module
```

**Admin Web Portal:**
```bash
npm run dev --workspace=frontend/web/admin
```

**Customer Web Portal:**
```bash
npm run dev --workspace=frontend/web/customer
```

**LMS Web Portal:**
```bash
npm run dev --workspace=frontend/web/lms
```

**Mobile App:**
```bash
npm run start --workspace=frontend/mobile
```

## Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md)
- [API Specification](./docs/API_SPECIFICATION.md)
