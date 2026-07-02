// src/modules/web/customers/customers.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { loansRepository } from '@/modules/loans/loans.repository';
import { kycRepository } from '@/modules/kyc';

const router = Router();

const STAFF_ROLES = [
    ROLE.ADMIN, ROLE.SUPER_ADMIN,
    ROLE.CREDIT_MANAGER, ROLE.OPS_EXECUTIVE,
    ROLE.FINANCE, ROLE.COLLECTION_AGENT,
];

// GET /customers?search=&page=&limit=
router.get('/', requireAuth(), allowRoles(...STAFF_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { search, page, limit } = req.query;
        const { prisma } = await import('@/config/database');

        const pageNum  = page  ? parseInt(page  as string, 10) : 1;
        const limitNum = limit ? parseInt(limit as string, 10) : 20;
        const skip     = (pageNum - 1) * limitNum;

        const where: any = {};
        if (search) {
            where.user = {
                OR: [
                    { full_name: { contains: search as string, mode: 'insensitive' } },
                    { phone:     { contains: search as string } },
                    { email:     { contains: search as string, mode: 'insensitive' } },
                ],
            };
        }

        const [rows, total] = await Promise.all([
            prisma.customers.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { created_at: 'desc' },
                include: {
                    user: {
                        select: {
                            id:        true,
                            full_name: true,
                            phone:     true,
                            email:     true,
                            is_active: true,
                        },
                    },
                },
            }),
            prisma.customers.count({ where }),
        ]);

        res.status(HTTP.OK).json({
            data: rows.map(r => ({
                id:             r.id,
                userId:         r.user_id,
                fullName:       r.user.full_name,
                phone:          r.user.phone,
                email:          r.user.email,
                isActive:       r.user.is_active,
                city:           r.city,
                state:          r.state,
                pincode:        r.pincode,
                employmentType: r.employment_type,
                employerName:   r.employer_name,
                createdAt:      r.created_at,
            })),
            meta: {
                page:     pageNum,
                pageSize: limitNum,
                total,
            },
        });
    } catch (err) { next(err); }
});

// GET /customers/:id
router.get('/:id', requireAuth(), allowRoles(...STAFF_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');

        const customer = await prisma.customers.findUnique({
            where: { id: req.params.id as string },
            include: {
                user: {
                    select: {
                        id:         true,
                        full_name:  true,
                        phone:      true,
                        email:      true,
                        is_active:  true,
                        created_at: true,
                    },
                },
            },
        });

        if (!customer) {
            res.status(HTTP.NOT_FOUND).json({ error: 'Customer not found' });
            return;
        }

        // KYC status
        const kyc = await kycRepository.findByUserId(customer.user_id);

        res.status(HTTP.OK).json({
            id:             customer.id,
            userId:         customer.user_id,
            fullName:       customer.user.full_name,
            phone:          customer.user.phone,
            email:          customer.user.email,
            isActive:       customer.user.is_active,
            memberSince:    customer.user.created_at,
            address: {
                flatHouseNo: customer.flat_house_no,
                streetArea:  customer.street_area,
                city:        customer.city,
                state:       customer.state,
                pincode:     customer.pincode,
            },
            employment: {
                type: customer.employment_type,
                name: customer.employer_name,
            },
            kyc: kyc ? {
                status:    kyc.overallStatus,
                updatedAt: kyc.updatedAt,
            } : null,
            createdAt: customer.created_at,
            updatedAt: customer.updated_at,
        });
    } catch (err) { next(err); }
});

// GET /customers/:id/loans
router.get('/:id/loans', requireAuth(), allowRoles(...STAFF_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');

        const customer = await prisma.customers.findUnique({
            where: { id: req.params.id as string },
        });

        if (!customer) {
            res.status(HTTP.NOT_FOUND).json({ error: 'Customer not found' });
            return;
        }

        const page     = req.query.page  ? parseInt(req.query.page  as string, 10) : 1;
        const limit    = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

        const result = await loansRepository.listApplications({
            userId: customer.user_id,
            page,
            limit,
            sortBy:    'appliedAt',
            sortOrder: 'desc',
        });

        res.status(HTTP.OK).json({
            data: result.data,
            meta: {
                page:     result.pagination?.page  ?? 1,
                pageSize: result.pagination?.limit ?? 20,
                total:    result.pagination?.total ?? 0,
            },
        });
    } catch (err) { next(err); }
});

export { router as customersWebRouter };