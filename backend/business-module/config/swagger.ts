// config/swagger.ts
// Auto-generated API documentation using Swagger/OpenAPI 3.0
// Accessible at /api-docs in development

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title:       'Fuehrer NBFC API',
            version:     '1.0.0',
            description: 'REST API for Fuehrer NBFC — Consumer Durable, Gold Loan and Affordable Housing Loan platform',
            contact: {
                name:  'CIEL INFITECH PVT LTD',
                email: 'dev@cielinfitech.com',
            },
        },
        servers: [
            {
                url:         `http://localhost:${env.port}/api/${env.apiVersion}`,
                description: 'Development server',
            },
            {
                url:         `https://api.fuehrer.in/api/${env.apiVersion}`,
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type:         'http',
                    scheme:       'bearer',
                    bearerFormat: 'JWT',
                    description:  'JWT token obtained from /admin/auth/login or /auth/verify-otp',
                },
            },
            schemas: {
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data:    { type: 'object' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success:   { type: 'boolean', example: false },
                        errorCode: { type: 'string',  example: 'VALIDATION_ERROR' },
                        message:   { type: 'string',  example: 'Validation failed' },
                        details:   { type: 'object',  nullable: true },
                        timestamp: { type: 'string',  format: 'date-time' },
                        requestId: { type: 'string',  format: 'uuid' },
                    },
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data:    { type: 'array', items: { type: 'object' } },
                        total:   { type: 'integer', example: 100 },
                        page:    { type: 'integer', example: 1 },
                        limit:   { type: 'integer', example: 20 },
                    },
                },
                LoanApplication: {
                    type: 'object',
                    properties: {
                        id:              { type: 'string', format: 'uuid' },
                        referenceNumber: { type: 'string', example: 'FHR-2026-000001' },
                        productType:     { type: 'string', enum: ['CONSUMER_DURABLE', 'GOLD_LOAN', 'HOUSING_LOAN', 'PERSONAL_LOAN', 'KUSH_GHAR', 'LAKSHAYA'] },
                        status:          { type: 'string', enum: ['DRAFT', 'KYC_PENDING', 'UNDERWRITING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ESIGN_PENDING', 'DISBURSED', 'ACTIVE', 'CLOSED', 'NPA'] },
                        amountRequested: { type: 'number', example: 50000 },
                        tenureMonths:    { type: 'integer', example: 12 },
                        interestRate:    { type: 'number', example: 18.0 },
                        appliedAt:       { type: 'string', format: 'date-time' },
                    },
                },
                LoanAccount: {
                    type: 'object',
                    properties: {
                        id:             { type: 'string', format: 'uuid' },
                        accountNumber:  { type: 'string', example: 'LA-2026-000001' },
                        status:         { type: 'string', enum: ['ACTIVE', 'OVERDUE', 'NPA', 'CLOSED'] },
                        principal:      { type: 'number', example: 50000 },
                        outstanding:    { type: 'number', example: 35000 },
                        emiAmount:      { type: 'number', example: 4500 },
                        nextDueDate:    { type: 'string', format: 'date' },
                        dpd:            { type: 'integer', example: 0 },
                    },
                },
            },
        },
        security: [{ BearerAuth: [] }],
        tags: [
            { name: 'Auth',           description: 'Customer OTP authentication' },
            { name: 'Staff Auth',     description: 'Admin staff login' },
            { name: 'Loans',          description: 'Loan application lifecycle' },
            { name: 'KYC',            description: 'KYC verification' },
            { name: 'EMI',            description: 'EMI schedule and payments' },
            { name: 'Payments',       description: 'Payment collection' },
            { name: 'Collections',    description: 'Collections management' },
            { name: 'Disbursement',   description: 'Loan disbursement' },
            { name: 'Gold Loans',     description: 'Gold Loan specific APIs' },
            { name: 'Housing Loans',  description: 'Housing Loan specific APIs' },
            { name: 'CDL',            description: 'Consumer Durable Loan APIs' },
            { name: 'Admin',          description: 'Admin Panel APIs' },
            { name: 'LMS',            description: 'Loan Management System APIs' },
            { name: 'Reports',        description: 'Reports and analytics' },
            { name: 'Agents',         description: 'Field agent management' },
            { name: 'Permissions',    description: 'RBAC permissions management' },
            { name: 'Settings',       description: 'System configuration' },
            { name: 'Health',         description: 'Health check' },
        ],
    },
    apis: [
        './src/modules/**/*.routes.ts',
        './src/modules/web/**/*.routes.ts',
    ],
};

export const swaggerSpec = swaggerJsdoc(options);