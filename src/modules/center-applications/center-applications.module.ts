import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CenterApplicationModel } from './entities/center-application.entity';
import { CenterApplicationsService } from './center-applications.service';
import { CenterApplicationsController } from './center-applications.controller';

@Module({
  imports: [SequelizeModule.forFeature([CenterApplicationModel])],
  controllers: [CenterApplicationsController],
  providers: [CenterApplicationsService],
  exports: [CenterApplicationsService],
})
export class CenterApplicationsModule {}
