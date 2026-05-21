import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GroupService } from './groups.service';
import { GroupController } from './groups.controller';
import { GroupModel } from './model/group.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { GroupStudentModel } from '../group_student_model';
import { LevelModel } from '../level/model/level.entity';
import {GroupLessonModel} from '../group-lesson/entities/group-lesson.entity'
import { ChatRoomModel } from '../chat/entities/chat-room.entity';
import { RoomModel } from '../rooms/entities/room.entity';
import { AttendanceModel } from '../attendence/model/attendence.entity';
import { StudentModel } from '../students/model/student.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([GroupModel, TeacherModel, GroupStudentModel,LevelModel,GroupLessonModel, ChatRoomModel, RoomModel, AttendanceModel, StudentModel]),
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
