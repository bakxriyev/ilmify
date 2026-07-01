import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AcademySettingModel } from './entities/academy-setting.entity';
import { UpdateAcademySettingDto } from './dto/academy-setting.dto';

@Injectable()
export class AcademySettingsService {
  private readonly logger = new Logger(AcademySettingsService.name);

  constructor(
    @InjectModel(AcademySettingModel) private academyModel: typeof AcademySettingModel,
  ) {}

  async get(center_id: number): Promise<AcademySettingModel> {
    let settings = await this.academyModel.findOne({ where: { center_id } });
    if (!settings) {
      settings = await this.academyModel.create({ center_id } as any);
    }
    return settings;
  }

  async update(center_id: number, dto: UpdateAcademySettingDto): Promise<AcademySettingModel> {
    let settings = await this.academyModel.findOne({ where: { center_id } });
    if (!settings) {
      settings = await this.academyModel.create({ center_id } as any);
    }
    await settings.update(dto as any);
    return settings.reload();
  }
}
