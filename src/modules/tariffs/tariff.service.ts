import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TariffModel } from './entities/tariff.entity';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@Injectable()
export class TariffService {
  constructor(
    @InjectModel(TariffModel)
    private tariffModel: typeof TariffModel,
  ) {}

  async create(dto: CreateTariffDto) {
    const existing = await this.tariffModel.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Bu nomli tarif mavjud');
    return this.tariffModel.create(dto as any);
  }

  async findAll() {
    return this.tariffModel.findAll({ order: [['student_min', 'ASC']] });
  }

  async findOne(id: number) {
    const tariff = await this.tariffModel.findByPk(id);
    if (!tariff) throw new NotFoundException('Tarif topilmadi');
    return tariff;
  }

  async update(id: number, dto: UpdateTariffDto) {
    const tariff = await this.findOne(id);
    await tariff.update(dto);
    return tariff;
  }

  async remove(id: number) {
    const tariff = await this.findOne(id);
    await tariff.destroy();
    return { message: 'Tarif o\'chirildi' };
  }
}
