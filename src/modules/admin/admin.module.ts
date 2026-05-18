import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminModel } from './model';
import { EducationCenterModule } from '../education-centers/education-center.module';

@Module({
  imports: [
    SequelizeModule.forFeature([AdminModel]),
    EducationCenterModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService], 
})
export class AdminModule {}
