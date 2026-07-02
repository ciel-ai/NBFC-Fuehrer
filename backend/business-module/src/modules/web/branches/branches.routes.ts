// src/modules/web/branches/branches.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { HTTP, ROLE } from '@/config/constants';
import type { AuthRequest } from '@/types/express';

const router = Router();

const ADMIN_ROLES   = [ROLE.ADMIN, ROLE.SUPER_ADMIN];
const MANAGER_ROLES = [ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.CREDIT_MANAGER, ROLE.OPS_EXECUTIVE];

// GET /branches?city=&isActive=&page=&limit=
router.get('/', requireAuth(), allowRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');
        const { city, isActive, page, limit } = req.query;

        const pageNum  = page  ? parseInt(page  as string, 10) : 1;
        const limitNum = limit ? parseInt(limit as string, 10) : 20;

        const where: any = {};
        if (city)     where.city      = { contains: city as string, mode: 'insensitive' };
        if (isActive !== undefined) where.is_active = isActive === 'true';

        const [rows, total] = await Promise.all([
            prisma.branches.findMany({
                where,
                skip:    (pageNum - 1) * limitNum,
                take:    limitNum,
                orderBy: { name: 'asc' },
            }),
            prisma.branches.count({ where }),
        ]);

        res.status(HTTP.OK).json({
           data: rows.map(b => {
                const br = b as any;
                return {
                    id:           br.id,
                    name:         br.name,
                    address:      br.address,
                    city:         br.city,
                    state:        br.state,
                    pincode:      br.pincode,
                    phone:        br.phone,
                    lat:          br.lat  ? Number(br.lat)  : null,
                    lng:          br.lng  ? Number(br.lng)  : null,
                    workingHours: br.working_hours,
                    isActive:     br.is_active,
                    managerId:    br.manager_id,
                    createdAt:    br.created_at,
                };
            }),
            meta: { page: pageNum, pageSize: limitNum, total },
        });
    } catch (err) { next(err); }
});
// GET /branches/:id
router.get('/:id', requireAuth(), allowRoles(...MANAGER_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');

        const branch = await prisma.branches.findUnique({
            where: { id: req.params.id as string },
            include: {
                admin_users_branches_manager_idToadmin_users: {
                    select: { id: true, full_name: true, email: true, phone: true },
                },
                appointments: {
                    take: 10,
                    orderBy: { preferred_date: 'desc' },
                    select: {
                        id:             true,
                        preferred_date: true,
                        preferred_slot: true,
                        status:         true,
                    },
                },
            },
        });

        if (!branch) {
            res.status(HTTP.NOT_FOUND).json({ error: 'Branch not found' });
            return;
        }

        res.status(HTTP.OK).json({
            id:           branch.id,
            name:         branch.name,
            address:      branch.address,
            city:         branch.city,
            state:        branch.state,
            pincode:      branch.pincode,
            phone:        branch.phone,
            lat:          (branch as any).lat  ? Number((branch as any).lat)  : null,
            lng:          (branch as any).lng  ? Number((branch as any).lng)  : null,
            workingHours: (branch as any).working_hours,
            isActive:     branch.is_active,
            manager:      branch.admin_users_branches_manager_idToadmin_users ?? null,
            recentAppointments: branch.appointments,
            createdAt:    branch.created_at,
        });
    } catch (err) { next(err); }
});

// POST /branches
router.post('/', requireAuth(), allowRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');
        const {
            name, address, city, state, pincode,
            phone, lat, lng, workingHours, managerId,
        } = req.body;

        const branch = await prisma.branches.create({
            data: {
                name,
                address,
                city,
                state,
                pincode,
                phone,
                ...(lat          !== undefined && { lat }),
                ...(lng          !== undefined && { lng }),
                ...(workingHours !== undefined && { working_hours: workingHours }),
                manager_id:   managerId    ?? null,
                is_active:    true,
                created_at:   new Date(),
                updated_at:   new Date(),
            },
        });

        res.status(HTTP.CREATED).json({
            id:       branch.id,
            name:     branch.name,
            city:     branch.city,
            isActive: branch.is_active,
        });
    } catch (err) { next(err); }
});

// PATCH /branches/:id
router.patch('/:id', requireAuth(), allowRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');
        const {
            name, address, city, state, pincode,
            phone, lat, lng, workingHours, managerId,
        } = req.body;

        const branch = await prisma.branches.update({
            where: { id: req.params.id as string },
            data: {
                ...(name         && { name }),
                ...(address      && { address }),
                ...(city         && { city }),
                ...(state        && { state }),
                ...(pincode      && { pincode }),
                ...(phone        && { phone }),
                ...(lat          !== undefined && { lat }),
                ...(lng          !== undefined && { lng }),
                ...(workingHours && { working_hours: workingHours }),
                ...(managerId    !== undefined && { manager_id: managerId }),
                updated_at: new Date(),
            },
        });

        res.status(HTTP.OK).json({
            id:       branch.id,
            name:     branch.name,
            city:     branch.city,
            isActive: branch.is_active,
        });
    } catch (err) { next(err); }
});

// POST /branches/:id/activate
router.post('/:id/activate', requireAuth(), allowRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');
        const branch = await prisma.branches.update({
            where: { id: req.params.id as string },
            data:  { is_active: true, updated_at: new Date() },
        });
        res.status(HTTP.OK).json({ id: branch.id, isActive: branch.is_active });
    } catch (err) { next(err); }
});

// POST /branches/:id/deactivate
router.post('/:id/deactivate', requireAuth(), allowRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prisma } = await import('@/config/database');
        const branch = await prisma.branches.update({
            where: { id: req.params.id as string },
            data:  { is_active: false, updated_at: new Date() },
        });
        res.status(HTTP.OK).json({ id: branch.id, isActive: branch.is_active });
    } catch (err) { next(err); }
});

export { router as branchesWebRouter };