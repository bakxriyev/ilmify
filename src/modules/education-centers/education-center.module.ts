import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EducationCenterController } from './education-center.controller';
import { EducationCenterService } from './education-center.service';
import { EducationCenterModel } from './entities/education-center.entity';
import { CenterBranchModel } from './entities/center-branch.entity';
import { TariffModel } from '../tariffs/entities/tariff.entity';
import { AdminModel } from '../admin/model/admin.entity';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { ParentModel } from '../parents/entities/parent.entity';
import { GroupModel } from '../groups/model/group.entity';

@Module({
  imports: [SequelizeModule.forFeature([EducationCenterModel, CenterBranchModel, TariffModel, AdminModel, StudentModel, TeacherModel, ParentModel, GroupModel])],
  controllers: [EducationCenterController],
  providers: [EducationCenterService],
  exports: [EducationCenterService],
})
export class EducationCenterModule {}
