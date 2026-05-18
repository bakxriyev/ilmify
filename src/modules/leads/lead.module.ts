import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { LeadModel } from './entities/lead.entity';
import { LeadSourceModel } from '../lead-sources/entities/lead-source.entity';
import { LeadSourceService } from '../lead-sources/lead-source.service';
import { StudentModel } from '../students/model/student.entity';
import { GroupStudentModel } from '../group_student_model';
import { EducationCenterService } from '../education-centers/education-center.service';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { CenterBranchModel } from '../education-centers/entities/center-branch.entity';
import { AdminModel } from '../admin/model/admin.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { ParentModel } from '../parents/entities/parent.entity';
import { GroupModel } from '../groups/model/group.entity';

@Module({
  imports: [SequelizeModule.forFeature([LeadModel, LeadSourceModel, StudentModel, GroupStudentModel, EducationCenterModel, CenterBranchModel, AdminModel, TeacherModel, ParentModel, GroupModel])],
  controllers: [LeadController],
  providers: [LeadService, EducationCenterService, LeadSourceService],
  exports: [LeadService],
})
export class LeadModule {}
