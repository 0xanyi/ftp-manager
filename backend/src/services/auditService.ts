import { Prisma } from '@prisma/client';
import { prisma } from '../app';
import logger from '../utils/logger';

export interface AuditEvent {
  action: string;
  actorId?: string;
  actorEmail?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
}

class AuditService {
  /**
   * Persist an audit log entry. Errors are logged but do not block the main flow.
   */
  async recordEvent(event: AuditEvent): Promise<void> {
    try {
      const data: Prisma.AuditLogUncheckedCreateInput = {
        action: event.action,
        actorId: event.actorId,
        actorEmail: event.actorEmail,
        entityType: event.entityType,
        entityId: event.entityId,
        ipAddress: event.ipAddress,
      };

      if (typeof event.metadata !== 'undefined') {
        data.metadata = event.metadata;
      }

      await prisma.auditLog.create({ data });
    } catch (error) {
      logger.error('Failed to record audit event', { error, event });
    }
  }

  /**
   * Retrieve audit logs with basic pagination and filtering.
   */
  async getAuditLogs(query: AuditLogQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.action) {
      where['action'] = query.action;
    }

    if (query.entityType) {
      where['entityType'] = query.entityType;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

const auditService = new AuditService();

export default auditService;
