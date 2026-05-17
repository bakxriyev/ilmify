// src/modules/tasks/tasks.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { TaskService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// Uploads papkasini yaratish (agar mavjud bo'lmasa)
const uploadDir = './uploads/tasks';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer konfiguratsiyasi
const multerOptions = {
  storage: diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => {
      const uniqueName = uuidv4();
      const fileExt = extname(file.originalname);
      callback(null, `${uniqueName}${fileExt}`);
    },
  }),
  fileFilter: (req, file, callback) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new BadRequestException(`Ruxsat etilmagan fayl turi: ${file.mimetype}`), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
};

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi task yaratish' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'media', maxCount: 1 },
        { name: 'photo', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
        { name: 'video', maxCount: 1 },
      ],
      multerOptions,
    ),
  )
  async create(
    @Body() body: CreateTaskDto,
    @UploadedFiles()
    files?: {
      media?: Express.Multer.File[];
      photo?: Express.Multer.File[];
      audio?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ) {
    // Fayl nomlarini olish
    const fileMap: Record<string, string> = {};

    if (files) {
      if (files.photo?.[0]) fileMap.photo = files.photo[0].filename;
      if (files.audio?.[0]) fileMap.audio = files.audio[0].filename;
      if (files.video?.[0]) fileMap.video = files.video[0].filename;
      if (files.media?.[0]) fileMap.media = files.media[0].filename;
    }

    // exercise_id ni tekshirish
    if (!body.exercise_id) {
      throw new BadRequestException('exercise_id majburiy maydon');
    }

    // Ma'lumotlarni tayyorlash
    const taskData: CreateTaskDto = {
      exercise_id: Number(body.exercise_id),
      ...(body.title && { title: body.title }),
      ...(body.question_text && { question_text: body.question_text }),
      ...(body.description && { description: body.description }),
      ...(body.writing_q && { writing_q: body.writing_q }),
      ...(body.correct_answer && { correct_answer: body.correct_answer }),
      ...(body.ordinary_number && { ordinary_number: Number(body.ordinary_number) }),
      ...(body.extra_data && { extra_data: body.extra_data }),
    };

    // Fayl maydonlari
    if (fileMap.photo) taskData.photo = fileMap.photo;
    if (fileMap.audio) taskData.audio = fileMap.audio;
    if (fileMap.video) taskData.video = fileMap.video;
    if (fileMap.media) taskData.media = fileMap.media;

    return this.taskService.create(taskData);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha tasklar' })
  @ApiQuery({ name: 'exercise_id', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort_by', enum: ['id', 'ordinary_number', 'title'], required: false })
  @ApiQuery({ name: 'sort_order', enum: ['ASC', 'DESC'], required: false })
  @ApiQuery({ name: 'include', enum: ['exercise', 'student_answers'], required: false })
  findAll(@Query() query: any) {
    return this.taskService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta task' })
  @ApiQuery({ name: 'include', required: false, enum: ['exercise', 'student_answers'] })
  findOne(@Param('id', ParseIntPipe) id: number, @Query('include') include?: string) {
    return this.taskService.findOne(id, include);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Taskni yangilash (PATCH)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'media', maxCount: 1 },
        { name: 'photo', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
        { name: 'video', maxCount: 1 },
      ],
      multerOptions,
    ),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaskDto,
    @UploadedFiles()
    files?: {
      media?: Express.Multer.File[];
      photo?: Express.Multer.File[];
      audio?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ) {
    console.log('Update request for task ID:', id);
    console.log('Request body:', body);
    
    // Yangi fayl nomlari
    const fileMap: Record<string, string> = {};

    if (files) {
      console.log('Uploaded files:', files);
      if (files.photo?.[0]) fileMap.photo = files.photo[0].filename;
      if (files.audio?.[0]) fileMap.audio = files.audio[0].filename;
      if (files.video?.[0]) fileMap.video = files.video[0].filename;
      if (files.media?.[0]) fileMap.media = files.media[0].filename;
    }

    // Update ma'lumotlarini tayyorlash
    const updateData: UpdateTaskDto = {};

    // Majburiy maydonlar - faqat kelgan bo'lsa
    if (body.exercise_id !== undefined) updateData.exercise_id = Number(body.exercise_id);
    if (body.ordinary_number !== undefined) updateData.ordinary_number = Number(body.ordinary_number);

    // Matn maydonlari - faqat kelgan bo'lsa
    if (body.title !== undefined) updateData.title = body.title;
    if (body.question_text !== undefined) updateData.question_text = body.question_text;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.writing_q !== undefined) updateData.writing_q = body.writing_q;
    if (body.correct_answer !== undefined) updateData.correct_answer = body.correct_answer;
    
    // extra_data - faqat kelgan bo'lsa
    if (body.extra_data !== undefined) {
      updateData.extra_data = body.extra_data;
    }

    // Fayl o'chirish flaglari - faqat kelgan bo'lsa
    if (body.delete_photo !== undefined) updateData.delete_photo = body.delete_photo;
    if (body.delete_audio !== undefined) updateData.delete_audio = body.delete_audio;
    if (body.delete_video !== undefined) updateData.delete_video = body.delete_video;
    if (body.delete_media !== undefined) updateData.delete_media = body.delete_media;

    // Yangi fayllar - agar yuklangan bo'lsa
    if (fileMap.photo) updateData.photo = fileMap.photo;
    if (fileMap.audio) updateData.audio = fileMap.audio;
    if (fileMap.video) updateData.video = fileMap.video;
    if (fileMap.media) updateData.media = fileMap.media;

    console.log('Update data being sent to service:', updateData);

    return this.taskService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Taskni o‘chirish' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.delete(id);
  }

  @Get('exercise/:exerciseId')
  @ApiOperation({ summary: 'Exercise dagi tasklar' })
  getByExercise(@Param('exerciseId', ParseIntPipe) exerciseId: number) {
    return this.taskService.getTasksByExercise(exerciseId);
  }
}