import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AttendanceService } from './attendence.service';
import { AttendanceController } from './attendence.controller';
import { StudentModel } from '../students/model/student.entity';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';
import { AttendanceModel } from './model/attendence.entity';
import { GroupModel } from '../groups/model/group.entity';

@Module({
  imports: [SequelizeModule.forFeature([AttendanceModel, StudentModel, GroupLessonModel,GroupModel])],
  providers: [AttendanceService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}