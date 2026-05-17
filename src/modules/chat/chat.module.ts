import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { ChatRoomModel } from "./entities/chat-room.entity";
import { ChatMessageModel } from "./entities/chat-message.entity";
import { MessageStatusModel } from "./entities/message-status.entity";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { GroupModel } from "../groups/model/group.entity";
import { GroupStudentModel } from "../group_student_model";
import { StudentModel } from "../students/model/student.entity";
import { TeacherModel } from "../teachers/model/teacher.model";
import { ParentStudentModel } from "../parents/entities/parent-student.entity";
import { ParentModel } from "../parents/entities/parent.entity";
import { ChatAuthGuard } from "./chat-auth.guard";

@Module({
  imports: [
    SequelizeModule.forFeature([
      ChatRoomModel,
      ChatMessageModel,
      MessageStatusModel,
      GroupModel,
      GroupStudentModel,
      StudentModel,
      TeacherModel,
      ParentStudentModel,
      ParentModel,
    ]),
  ],
  providers: [ChatGateway, ChatService, ChatAuthGuard],
  controllers: [ChatController],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
