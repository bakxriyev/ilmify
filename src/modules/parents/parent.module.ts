import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ParentModel } from './entities/parent.entity';
import { ParentStudentModel } from './entities/parent-student.entity';
import { ParentService } from './parent.service';
import { ParentController } from './parent.controller';
import { StudentModel } from '../students/model/student.entity';
import { ChatRoomModel } from '../chat/entities/chat-room.entity';
import { GroupStudentModel } from '../group_student_model';
import { ChatAuthGuard } from '../chat/chat-auth.guard';

@Module({
  imports: [SequelizeModule.forFeature([ParentModel, ParentStudentModel, StudentModel, ChatRoomModel, GroupStudentModel])],
  controllers: [ParentController],
  providers: [ParentService, ChatAuthGuard],
  exports: [ParentService],
})
export class ParentModule {}
