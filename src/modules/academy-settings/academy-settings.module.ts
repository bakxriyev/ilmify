import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AcademySettingsController } from './academy-settings.controller';
import { AcademySettingsService } from './academy-settings.service';
import { AcademySettingModel } from './entities/academy-setting.entity';

@Module({
  imports: [SequelizeModule.forFeature([AcademySettingModel])],
  controllers: [AcademySettingsController],
  providers: [AcademySettingsService],
  exports: [AcademySettingsService],
})
export class AcademySettingsModule {}
