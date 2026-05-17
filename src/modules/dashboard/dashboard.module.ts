import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { GroupModel } from '../groups/model/group.entity';
import { LevelModel } from '../level/model/level.entity';
import { RoomModel } from '../rooms/entities/room.entity';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';
import { AttendanceModel } from '../attendence/model/attendence.entity';
import { GroupStudentModel } from '../group_student_model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      StudentModel, TeacherModel, GroupModel, LevelModel, RoomModel,
      GroupLessonModel, AttendanceModel, GroupStudentModel,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
