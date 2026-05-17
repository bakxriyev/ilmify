import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { LeadSourceModel } from './entities/lead-source.entity';
import { CreateLeadSourceDto, UpdateLeadSourceDto } from './dto/lead-source.dto';

@Injectable()
export class LeadSourceService {
  constructor(
    @InjectModel(LeadSourceModel) private sourceModel: typeof LeadSourceModel,
  ) {}

  async create(dto: CreateLeadSourceDto, center_id: number) {
    return this.sourceModel.create({ ...dto, center_id });
  }

  async findAll(center_id?: number) {
    const where: any = {};
    if (center_id) where.center_id = center_id;
    return this.sourceModel.findAll({ where, order: [['createdAt', 'DESC']] });
  }

  async findOne(id: number) {
    const source = await this.sourceModel.findByPk(id);
    if (!source) throw new NotFoundException('Manba topilmadi');
    return source;
  }

  async findByCode(code: string) {
    return this.sourceModel.findOne({ where: { code }, include: ['center'] });
  }

  async update(id: number, dto: UpdateLeadSourceDto) {
    const source = await this.findOne(id);
    await source.update(dto);
    return source;
  }

  async remove(id: number) {
    const source = await this.findOne(id);
    await source.destroy();
    return { message: "Manba o'chirildi" };
  }
}
