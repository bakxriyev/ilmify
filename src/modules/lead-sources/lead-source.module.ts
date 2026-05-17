import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LeadSourceController } from './lead-source.controller';
import { LeadSourceService } from './lead-source.service';
import { LeadSourceModel } from './entities/lead-source.entity';

@Module({
  imports: [SequelizeModule.forFeature([LeadSourceModel])],
  controllers: [LeadSourceController],
  providers: [LeadSourceService],
  exports: [LeadSourceService],
})
export class LeadSourceModule {}
