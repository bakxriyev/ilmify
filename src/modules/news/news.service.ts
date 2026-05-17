import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { NewsModel } from './entities/news.entity';
import { CreateNewsDto } from './dto/create-news.dto';

@Injectable()
export class NewsService {
  constructor(@InjectModel(NewsModel) private newsRepo: typeof NewsModel) {}

  // Create news
  async createNews(dto: CreateNewsDto, fileName?: string) {
    return this.newsRepo.create({ ...dto, media_url: fileName });
  }

  // Update news
  async updateNews(id: number, dto: Partial<CreateNewsDto>, fileName?: string) {
    const news = await this.newsRepo.findByPk(id);
    if (!news) throw new NotFoundException('News not found');

    const updated = { ...dto };
    if (fileName) updated.media_url = fileName;

    await news.update(updated);
    return news;
  }

  // Delete news
  async deleteNews(id: number) {
    const news = await this.newsRepo.findByPk(id);
    if (!news) throw new NotFoundException('News not found');
    await news.destroy();
    return { message: 'News deleted', news_id: id };
  }

  // Get all news
  async getAllNews() {
    return this.newsRepo.findAll({ order: [['createdAt', 'DESC']] });
  }

  // Get single news
  async getNews(id: number) {
    const news = await this.newsRepo.findByPk(id);
    if (!news) throw new NotFoundException('News not found');
    return news;
  }
}