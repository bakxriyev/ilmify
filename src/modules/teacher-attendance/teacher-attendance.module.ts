import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TeacherAttendanceController } from './teacher-attendance.controller';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { TeacherAttendanceLocationModel } from './model/teacher-attendance-location.model';
import { TeacherAttendanceModel } from './model/teacher-attendance.model';
import { TeacherModel } from '../teachers/model/teacher.model';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([TeacherAttendanceLocationModel, TeacherAttendanceModel, TeacherModel, EducationCenterModel]),
  ],
  controllers: [TeacherAttendanceController],
  providers: [TeacherAttendanceService],
  exports: [TeacherAttendanceService],
})
export class TeacherAttendanceModule {}
