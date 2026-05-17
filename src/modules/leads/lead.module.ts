import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { LeadModel } from './entities/lead.entity';
import { LeadSourceModel } from '../lead-sources/entities/lead-source.entity';

@Module({
  imports: [SequelizeModule.forFeature([LeadModel, LeadSourceModel])],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadModule {}
