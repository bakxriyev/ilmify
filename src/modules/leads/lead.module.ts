import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { LeadModel } from './entities/lead.entity';
import { LeadSourceModel } from '../lead-sources/entities/lead-source.entity';
import { LeadSourceService } from '../lead-sources/lead-source.service';
import { StudentModel } from '../students/model/student.entity';
import { GroupStudentModel } from '../group_student_model';
import { EducationCenterModule } from '../education-centers/education-center.module';

@Module({
  imports: [
    SequelizeModule.forFeature([LeadModel, LeadSourceModel, StudentModel, GroupStudentModel]),
    EducationCenterModule,
  ],
  controllers: [LeadController],
  providers: [LeadService, LeadSourceService],
  exports: [LeadService],
})
export class LeadModule {}
