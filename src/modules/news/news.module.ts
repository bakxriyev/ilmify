import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsModel } from './entities/news.entity';

@Module({
  imports: [SequelizeModule.forFeature([NewsModel])],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}