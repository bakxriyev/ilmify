import { Controller, Post, Body, Patch, Delete, Get, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // Upload news with file
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        news_date: { type: 'string', format: 'date' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/news',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|mp4|mov|avi|webm|webp)$/)) cb(new Error('Only image/video files!'), false);
        else cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadNews(@UploadedFile() file: Express.Multer.File, @Body() dto: CreateNewsDto) {
    const fileName = file?.filename;
    return this.newsService.createNews(dto, fileName);
  }

  // Update news
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/news',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|mp4|mov|avi|webm)$/)) cb(new Error('Only image/video files!'), false);
        else cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async updateNews(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() dto: Partial<CreateNewsDto>) {
    const fileName = file?.filename;
    return this.newsService.updateNews(+id, dto, fileName);
  }

  // Delete news
  @Delete(':id')
  async deleteNews(@Param('id') id: string) {
    return this.newsService.deleteNews(+id);
  }

  // Get all news
  @Get()
  async getAll() {
    return this.newsService.getAllNews();
  }

  // Get single news
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.newsService.getNews(+id);
  }
}