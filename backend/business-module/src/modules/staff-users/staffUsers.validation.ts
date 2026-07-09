// src/modules/staff-users/staffUsers.validation.ts
import Joi from 'joi';
import { ALL_STAFF_ROLES } from '@/constants/staffRoles.constants';

const phone10 = Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .message('Enter a valid 10-digit Indian mobile number');

const role = Joi.string().valid(...ALL_STAFF_ROLES);
const status = Joi.string().valid('ACTIVE', 'INACTIVE');

export const listUsersSchema = Joi.object({
    role: role.optional(),
    status: status.optional(),
    search: Joi.string().trim().max(100).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
});

export const createUserSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    phone: phone10.required(),
    email: Joi.string().email().max(255).required(),
    role: role.required(),
    branchId: Joi.string().uuid({ version: 'uuidv4' }).optional(),
    status: status.default('ACTIVE'),
});

export const updateUserSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    phone: phone10.optional(),
    email: Joi.string().email().max(255).optional(),
    role: role.optional(),
    branchId: Joi.string().uuid({ version: 'uuidv4' }).allow(null).optional(),
    status: status.optional(),
}).min(1);

export const idParamSchema = Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required(),
});
