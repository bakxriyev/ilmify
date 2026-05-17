import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RoomModel } from './entities/room.entity';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { GroupStudentModel } from '../group_student_model';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';

@Module({
  imports: [SequelizeModule.forFeature([RoomModel, GroupStudentModel, GroupLessonModel])],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
