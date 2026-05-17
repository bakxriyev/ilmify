import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TeacherController } from './teachers.controller';
import { TeacherService } from './teachers.service';
import { TeacherModel } from './model/teacher.model';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
import { RoomModel } from '../rooms/entities/room.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([TeacherModel, GroupModel, GroupStudentModel, RoomModel]),
  ],
  controllers: [TeacherController],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeacherModule {}