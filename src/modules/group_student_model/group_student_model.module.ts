// group-student.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GroupStudentService } from './group_student_model.service';
import { GroupStudentController } from './group_student_model.controller';
import { GroupStudentModel } from './model/group_student_model.entity';
import { GroupModel } from '../groups/model/group.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { ChatRoomModel } from '../chat/entities/chat-room.entity';

@Module({
  imports: [SequelizeModule.forFeature([GroupStudentModel, ChatRoomModel])],
  controllers: [GroupStudentController],
  providers: [GroupStudentService],
  exports: [GroupStudentService],
})
export class GroupStudentModule {}