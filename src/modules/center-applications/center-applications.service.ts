import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CenterApplicationModel, ApplicationStatus } from './entities/center-application.entity';
import { CreateCenterApplicationDto, UpdateApplicationStatusDto } from './dto/create-center-application.dto';

@Injectable()
export class CenterApplicationsService {
  constructor(
    @InjectModel(CenterApplicationModel)
    private model: typeof CenterApplicationModel,
  ) {}

  async create(dto: CreateCenterApplicationDto) {
    return this.model.create({
      center_name: dto.center_name,
      full_name: dto.full_name,
      phone: dto.phone,
      region: dto.region,
      description: dto.description || null,
      status: ApplicationStatus.NEW,
    });
  }

  async findAll() {
    return this.model.findAll({ order: [['created_at', 'DESC']] });
  }

  async findOne(id: number) {
    const app = await this.model.findByPk(id);
    if (!app) throw new NotFoundException('Ariza topilmadi');
    return app;
  }

  async updateStatus(id: number, dto: UpdateApplicationStatusDto) {
    const app = await this.findOne(id);
    await app.update({ status: dto.status as ApplicationStatus });
    return this.findOne(id);
  }

  async remove(id: number) {
    const app = await this.findOne(id);
    await app.destroy();
    return { message: 'Ariza o\'chirildi' };
  }
}
