import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { LeadModel, LeadStatus } from './entities/lead.entity';
import { LeadSourceModel } from '../lead-sources/entities/lead-source.entity';
import { CreateLeadDto } from './dto/lead.dto';
import { UpdateLeadDto } from './dto/lead.dto';

@Injectable()
export class LeadService {
  constructor(
    @InjectModel(LeadModel) private leadModel: typeof LeadModel,
    @InjectModel(LeadSourceModel) private sourceModel: typeof LeadSourceModel,
  ) {}

  async create(dto: CreateLeadDto, center_id: number) {
    return this.leadModel.create({
      ...dto,
      center_id,
      status: LeadStatus.NEW,
    });
  }

  async findAll(center_id?: number, status?: string, source_id?: number, search?: string) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    if (status) where.status = status;
    if (source_id) where.source_id = source_id;
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    return this.leadModel.findAll({
      where,
      include: [{ model: LeadSourceModel, attributes: ['id', 'name', 'platform'] }],
      order: [['created_at', 'DESC']],
    });
  }

  async findOne(id: number) {
    const lead = await this.leadModel.findByPk(id, {
      include: [{ model: LeadSourceModel }],
    });
    if (!lead) throw new NotFoundException('Lead topilmadi');
    return lead;
  }

  async update(id: number, dto: UpdateLeadDto) {
    const lead = await this.findOne(id);
    const updateData: any = { ...dto };
    if (dto.status === LeadStatus.CONTACTED && !lead.contacted_at) {
      updateData.contacted_at = new Date();
    }
    await lead.update(updateData);
    return this.findOne(id);
  }

  async remove(id: number) {
    const lead = await this.findOne(id);
    await lead.destroy();
    return { message: "Lead o'chirildi" };
  }

  async getStats(center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    const total = await this.leadModel.count({ where });
    const byStatus: any = {};
    for (const status of Object.values(LeadStatus)) {
      byStatus[status] = await this.leadModel.count({ where: { ...where, status } });
    }
    return { total, ...byStatus };
  }
}
