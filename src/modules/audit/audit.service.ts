import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AuditLogModel } from './entities/audit-log.entity';
import { QueryAuditDto } from './dto/query-audit.dto';
import { Op } from 'sequelize';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLogModel)
    private readonly auditLogModel: typeof AuditLogModel,
  ) {}

  async log(params: {
    admin_id: number;
    admin_name: string;
    action: string;
    entity_type: string;
    entity_id?: string | number;
    entity_name?: string;
    details?: any;
    description?: string;
    center_id?: number;
  }) {
    try {
      return await this.auditLogModel.create({
        admin_id: params.admin_id,
        admin_name: params.admin_name,
        action: params.action,
        entity_type: params.entity_type,
        entity_id: String(params.entity_id ?? ''),
        entity_name: params.entity_name || '',
        details: params.details || null,
        description: params.description || '',
        center_id: params.center_id || null,
      });
    } catch (err) {
      console.error('Audit log error:', err);
      return null;
    }
  }

  async findAll(query: QueryAuditDto, center_id?: number) {
    const { page = 1, limit = 20, action, entity_type, admin_name, search, from_date, to_date, sort_order = 'desc' } = query;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (center_id) where.center_id = center_id;
    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;
    if (admin_name) where.admin_name = { [Op.iLike]: `%${admin_name}%` };
    if (search) {
      where[Op.or] = [
        { description: { [Op.iLike]: `%${search}%` } },
        { entity_name: { [Op.iLike]: `%${search}%` } },
        { admin_name: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (from_date) {
      where.created_at = { ...where.created_at, [Op.gte]: new Date(from_date) };
    }
    if (to_date) {
      where.created_at = { ...where.created_at, [Op.lte]: new Date(to_date + 'T23:59:59.999Z') };
    }

    const { rows, count } = await this.auditLogModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', sort_order]],
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async getActions(center_id?: number): Promise<string[]> {
    const where: any = {};
    if (center_id) where.center_id = center_id;

    const rows = await this.auditLogModel.findAll({
      where,
      attributes: ['action'],
      group: ['action'],
      order: [['action', 'ASC']],
    });
    return rows.map(r => r.action);
  }

  async getEntityTypes(center_id?: number): Promise<string[]> {
    const where: any = {};
    if (center_id) where.center_id = center_id;

    const rows = await this.auditLogModel.findAll({
      where,
      attributes: ['entity_type'],
      group: ['entity_type'],
      order: [['entity_type', 'ASC']],
    });
    return rows.map(r => r.entity_type);
  }
}
