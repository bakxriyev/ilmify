import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { StoryModel } from './entities/story.entity';
import { StoryLikeModel } from './entities/story-like.entity';
import { StoryViewModel } from './entities/story-view.entity';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      StoryModel,
      StoryLikeModel,
      StoryViewModel,
      StudentModel,
      TeacherModel,
    ]),
  ],
  controllers: [StoryController],
  providers: [StoryService],
})
export class StoryModule {}