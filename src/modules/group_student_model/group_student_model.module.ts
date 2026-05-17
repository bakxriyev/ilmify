// group-student.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GroupStudentService } from './group_student_model.service';
import { GroupStudentController } from './group_student_model.controller';
import { GroupStudentModel } from './model';
import { GroupModel } from '../groups';
import { TeacherModel } from '../teachers';
import { ChatRoomModel } from '../chat/entities/chat-room.entity';

@Module({
  imports: [SequelizeModule.forFeature([GroupStudentModel, ChatRoomModel])],
  controllers: [GroupStudentController],
  providers: [GroupStudentService],
  exports: [GroupStudentService],
})
export class GroupStudentModule {}