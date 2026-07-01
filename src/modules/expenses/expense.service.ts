import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { ExpenseModel } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../../services/cache.service';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    @InjectModel(ExpenseModel) private expenseModel: typeof ExpenseModel,
    @InjectModel(EducationCenterModel) private centerModel: typeof EducationCenterModel,
    private auditService: AuditService,
    private cacheService: CacheService,
  ) {}

  async create(dto: CreateExpenseDto, user?: any, center_id?: number) {
    const adminId = user?.id || user?.sub || null;
    const adminName = user?.full_name || user?.name || 'Unknown';

    const expense = await this.expenseModel.create({
      amount: dto.amount,
      description: dto.description,
      date: dto.date,
      created_by: adminId,
      center_id: center_id || null,
    });

    // Subtract from center balance
    if (center_id) {
      const center = await this.centerModel.findByPk(center_id);
      if (center) {
        const currentBalance = Number(center.balance) || 0;
        await center.update({ balance: Math.max(0, currentBalance - Number(dto.amount)) });
      }
    }

    this.auditService.log({
      admin_id: adminId || 0,
      admin_name: adminName,
      action: 'create',
      entity_type: 'expense',
      entity_id: expense.id,
      entity_name: dto.description,
      description: `Chiqim qilindi: ${dto.description} | ${dto.amount} so'm | Admin: ${adminName}`,
      center_id: center_id || null,
      details: { amount: dto.amount, description: dto.description, date: dto.date, admin_name: adminName },
    });

    this.cacheService.del(`cache:${center_id || 'global'}:/reports`);

    return expense;
  }

  async findAll(center_id?: number, date_from?: string, date_to?: string) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    if (date_from || date_to) {
      const dateWhere: any = {};
      if (date_from) dateWhere[Op.gte] = date_from;
      if (date_to) dateWhere[Op.lte] = date_to;
      where.date = dateWhere;
    }

    return this.expenseModel.findAll({
      where,
      order: [['date', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async remove(id: number, user?: any) {
    const expense = await this.expenseModel.findByPk(id);
    if (!expense) throw new NotFoundException('Chiqim topilmadi');

    const adminName = user?.full_name || user?.name || 'Unknown';
    const adminId = user?.id || user?.sub || 0;
    const amount = Number(expense.amount);

    // Add back to center balance
    if (expense.center_id) {
      const center = await this.centerModel.findByPk(expense.center_id);
      if (center) {
        const currentBalance = Number(center.balance) || 0;
        await center.update({ balance: currentBalance + amount });
      }
    }

    await expense.destroy();

    this.auditService.log({
      admin_id: adminId,
      admin_name: adminName,
      action: 'delete',
      entity_type: 'expense',
      entity_id: id,
      entity_name: expense.description,
      description: `Chiqim o'chirildi: ${expense.description} | ${amount} so'm | Admin: ${adminName}`,
      center_id: expense.center_id,
      details: { amount, description: expense.description, date: expense.date, admin_name: adminName },
    });

    this.cacheService.del(`cache:${expense.center_id || 'global'}:/reports`);

    return { message: 'Chiqim o\'chirildi' };
  }
}
