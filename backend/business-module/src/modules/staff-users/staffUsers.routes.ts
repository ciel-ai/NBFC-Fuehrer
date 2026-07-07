// src/modules/staff-users/staffUsers.routes.ts
//
// Admin-only staff management (web dashboard) — mounted at /staff/users.
// Branches list is mounted separately at /staff/branches (any staff may read).
//
//   GET    /staff/users                 list (filter role/status/search)
//   POST   /staff/users                 create staff user
//   PATCH  /staff/users/:id             update
//   POST   /staff/users/:id/activate    activate
//   POST   /staff/users/:id/deactivate  deactivate
//   POST   /staff/users/:id/reset-password
//   GET    /staff/branches              list branches (any staff)

import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '@/middlewares';
import { verifyStaffToken } from '@/middlewares/verifyStaffToken.middleware';
import { requireModule } from '@/middlewares/staffRbac.middleware';
import { staffUsersController } from './staffUsers.controller';
import {
    listUsersSchema,
    createUserSchema,
    updateUserSchema,
    idParamSchema,
} from './staffUsers.validation';

// ─── /staff/users (ADMIN only — gated by the "users" module) ───────────────────
const usersRouter = Router();
usersRouter.use(verifyStaffToken('web'), requireModule('users'));

usersRouter.get('/', validateQuery(listUsersSchema), staffUsersController.list);
usersRouter.post('/', validateBody(createUserSchema), staffUsersController.create);
usersRouter.patch('/:id', validateParams(idParamSchema), validateBody(updateUserSchema), staffUsersController.update);
usersRouter.post('/:id/activate', validateParams(idParamSchema), staffUsersController.activate);
usersRouter.post('/:id/deactivate', validateParams(idParamSchema), staffUsersController.deactivate);
usersRouter.post('/:id/reset-password', validateParams(idParamSchema), staffUsersController.resetPassword);

// ─── /staff/branches (any authenticated staff — for form dropdowns) ─────────────
const branchesRouter = Router();
branchesRouter.use(verifyStaffToken('web'));
branchesRouter.get('/', staffUsersController.listBranches);

export { usersRouter as staffUsersRouter, branchesRouter as staffBranchesRouter };
