import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TariffController } from './tariff.controller';
import { TariffService } from './tariff.service';
import { TariffModel } from './entities/tariff.entity';

@Module({
  imports: [SequelizeModule.forFeature([TariffModel])],
  controllers: [TariffController],
  providers: [TariffService],
  exports: [TariffService, SequelizeModule],
})
export class TariffModule {}
