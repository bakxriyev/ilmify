import { Controller, Post, Body, Param, Get, Patch, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { LikeStoryDto } from './dto/like-story.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Stories')
@Controller('stories')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  // 🔹 Create story with file upload
  @Post()
  @ApiOperation({ summary: 'Yangi story yaratish (rasm/video bilan)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'Yangi Story' },
        description: { type: 'string', example: 'Story ta’rifi' },
      },
      required: ['file', 'title'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/stories',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|mp4|mov|avi|webm|ogg)$/)) {
          cb(new Error('Faqat rasm yoki video fayl qabul qilinadi!'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  createStory(@UploadedFile() file: Express.Multer.File, @Body() dto: CreateStoryDto) {
    const fileName = file.filename; // faqat file nomi
    return this.storyService.createStory({ ...dto, media_url: fileName });
  }

  // 🔹 Update story
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateStoryDto>) {
    return this.storyService.updateStory(+id, dto);
  }

  // 🔹 Delete story
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.storyService.deleteStory(+id);
  }

  // 🔹 Like story
  @Post(':id/like')
  like(@Param('id') id: string, @Body() dto: LikeStoryDto) {
    return this.storyService.likeStory(+id, dto);
  }

  // 🔹 Unlike story
  @Post(':id/unlike')
  unlike(@Param('id') id: string, @Body() dto: LikeStoryDto) {
    return this.storyService.unlikeStory(+id, dto);
  }

  // 🔹 Add view
  @Post(':id/view/:viewerId')
  addView(@Param('id') id: string, @Param('viewerId') viewerId: string) {
    return this.storyService.addView(+id, +viewerId);
  }

  // 🔹 Get all stories
  @Get()
  getAll() {
    return this.storyService.getAllStories();
  }

  // 🔹 Get single story
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.storyService.getStory(+id);
  }
}