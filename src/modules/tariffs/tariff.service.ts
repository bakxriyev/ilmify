import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TariffModel } from './entities/tariff.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@Injectable()
export class TariffService implements OnModuleInit {
  constructor(
    @InjectModel(TariffModel)
    private tariffModel: typeof TariffModel,
    @InjectModel(EducationCenterModel)
    private educationCenterModel: typeof EducationCenterModel,
  ) {}

  async onModuleInit() {
    const count = await this.tariffModel.count();
    if (count === 0) {
      const defaults = [
        { name: "Boshlang'ich", student_min: 0, student_max: 100,   price_1month: 300000,  price_3months: 700000,  price_6months: 1300000, price_12months: 2300000, description: '0-100 o\'quvchi uchun' },
        { name: 'Standart',      student_min: 101, student_max: 300,  price_1month: 550000,  price_3months: 1200000, price_6months: 2150000, price_12months: 3960000, description: '101-300 o\'quvchi uchun' },
        { name: 'Professional',  student_min: 301, student_max: 600,  price_1month: 850000,  price_3months: 1750000, price_6months: 3200000, price_12months: 5950000, description: '301-600 o\'quvchi uchun' },
        { name: 'Korporativ',    student_min: 601, student_max: 1000, price_1month: 1000000, price_3months: 2370000, price_6months: 4500000, price_12months: 8400000, description: '601-1000 o\'quvchi uchun' },
        { name: 'Premium',       student_min: 1001, student_max: 999999, price_1month: 0, price_3months: 0, price_6months: 0, price_12months: 0, description: '1000+ o\'quvchi — maxsus narx' },
      ];
      for (const t of defaults) {
        await this.tariffModel.findOrCreate({ where: { name: t.name }, defaults: t });
      }
    }
  }

  calculatePrice(tariff: TariffModel, months: number): number {
    if (months === 1) return Number(tariff.price_1month);
    if (months === 3) return Number(tariff.price_3months);
    if (months === 6) return Number(tariff.price_6months);
    if (months === 12) return Number(tariff.price_12months);
    return Number(tariff.price_1month) * months;
  }

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
    const centersCount = await this.educationCenterModel.count({ where: { tariff_id: id } });
    if (centersCount > 0) {
      throw new ConflictException(`Bu tarif ${centersCount} ta markaz tomonidan ishlatilmoqda. Avval ularni boshqa tarifga o'tkazing.`);
    }
    await tariff.destroy();
    return { message: 'Tarif o\'chirildi' };
  }
}
