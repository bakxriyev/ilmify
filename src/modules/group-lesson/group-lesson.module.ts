import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GroupModel } from '../groups/model/group.entity';
import { GroupLessonModel } from './entities/group-lesson.entity';
import { GroupLessonService } from './group-lesson.service';
import { GroupLessonController } from './group-lesson.controller';
import { UnitModel } from '../units/model/unit.entity';
import { RoomModel } from '../rooms/entities/room.entity';

@Module({
  imports: [SequelizeModule.forFeature([GroupModel, GroupLessonModel, UnitModel, RoomModel])],
  providers: [GroupLessonService],
  controllers: [GroupLessonController],
  exports: [GroupLessonService],
})
export class GroupLessonModule {}
