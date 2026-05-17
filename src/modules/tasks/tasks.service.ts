// src/modules/tasks/tasks.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { TaskModel } from './model/task.entity';
import { ExerciseModel } from '../exercises/model/exercise.entity';
import { StudentAnswerModel } from '../student-answer/model/student-answer.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(TaskModel)
    private readonly taskModel: typeof TaskModel,

    @InjectModel(ExerciseModel)
    private readonly exerciseModel: typeof ExerciseModel,
  ) {}

  // CREATE - Yangi task yaratish
  async create(dto: CreateTaskDto) {
    const exercise = await this.exerciseModel.findByPk(dto.exercise_id);
    if (!exercise) {
      throw new NotFoundException(`Exercise #${dto.exercise_id} topilmadi`);
    }

    // extra_data ni JSON qilib saqlash
    let extraData = dto.extra_data;
    if (extraData && typeof extraData === 'object') {
      extraData = JSON.stringify(extraData);
    }

    return this.taskModel.create({
      exercise_id: dto.exercise_id,
      question_text: dto.question_text,
      media: dto.media,
      correct_answer: dto.correct_answer,
      extra_data: extraData,
      photo: dto.photo,
      title: dto.title,
      description: dto.description,
      writing_q: dto.writing_q,
      audio: dto.audio,
      video: dto.video,
      ordinary_number: dto.ordinary_number,
    });
  }

  // READ ALL - Barcha tasklarni olish
  async findAll(query: {
    page?: number;
    limit?: number;
    exercise_id?: number;
    search?: string;
    sort_by?: 'id' | 'ordinary_number' | 'percentage' | 'title';
    sort_order?: 'ASC' | 'DESC';
    include?: 'exercise' | 'student_answers';
  }) {
    const {
      page = 1,
      limit = 20,
      exercise_id,
      search,
      sort_by = 'ordinary_number',
      sort_order = 'ASC',
      include,
    } = query;

    const offset = (page - 1) * limit;
    const where: any = {};

    if (exercise_id) where.exercise_id = exercise_id;
    if (search) {
      where[Op.or] = [
        { question_text: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { writing_q: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const includeArr: any[] = [];
    if (include?.includes('exercise')) {
      includeArr.push({ model: ExerciseModel, attributes: ['id', 'title', 'type'] });
    }
    if (include?.includes('student_answers')) {
      includeArr.push({ model: StudentAnswerModel, limit: 5 });
    }

    const { count, rows } = await this.taskModel.findAndCountAll({
      where,
      include: includeArr.length ? includeArr : undefined,
      limit,
      offset,
      order: [[sort_by, sort_order]],
      distinct: true,
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  // READ ONE - Bitta taskni olish
  async findOne(id: number, include?: string) {
    const includeArr: any[] = [];
    if (include?.includes('exercise')) {
      includeArr.push({ model: ExerciseModel });
    }
    if (include?.includes('student_answers')) {
      includeArr.push({ model: StudentAnswerModel });
    }

    const task = await this.taskModel.findByPk(id, {
      include: includeArr.length ? includeArr : undefined,
    });

    if (!task) {
      throw new NotFoundException(`Task #${id} topilmadi`);
    }

    return task;
  }

  // Eski faylni o'chirish uchun yordamchi funksiya
  private async deleteOldFile(filePath: string | null) {
    if (!filePath) return;
    
    const fullPath = path.join(process.cwd(), 'uploads', 'tasks', filePath);
    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        console.log(`Eski fayl o'chirildi: ${filePath}`);
      }
    } catch (error) {
      console.error(`Fayl o'chirishda xatolik: ${filePath}`, error);
    }
  }

  // UPDATE - Taskni yangilash (PATCH)
  async update(id: number, dto: UpdateTaskDto) {
    const task = await this.findOne(id);
    
    // Fayllarni o'chirish flaglari
    const deletePhoto = dto.delete_photo === 'true';
    const deleteAudio = dto.delete_audio === 'true';
    const deleteVideo = dto.delete_video === 'true';
    const deleteMedia = dto.delete_media === 'true';

    // Eski fayllarni o'chirish (agar yangi fayl yuklangan bo'lsa yoki o'chirish flagi bo'lsa)
    if ((dto.photo || deletePhoto) && task.photo) {
      await this.deleteOldFile(task.photo);
    }
    if ((dto.audio || deleteAudio) && task.audio) {
      await this.deleteOldFile(task.audio);
    }
    if ((dto.video || deleteVideo) && task.video) {
      await this.deleteOldFile(task.video);
    }
    if ((dto.media || deleteMedia) && task.media) {
      await this.deleteOldFile(task.media);
    }

    // extra_data ni JSON qilib saqlash
    let extraData = dto.extra_data;
    if (extraData !== undefined) {
      // Agar extra_data string bo'lsa va JSON bo'lishi mumkin bo'lsa
      if (typeof extraData === 'string') {
        try {
          // JSON validatsiyasi
          JSON.parse(extraData);
          // Agar valid JSON bo'lsa, shunday qoldiramiz
        } catch {
          // Agar invalid JSON bo'lsa, string sifatida qoldiramiz
        }
      } else if (extraData && typeof extraData === 'object') {
        // Agar object bo'lsa, stringify qilamiz
        extraData = JSON.stringify(extraData);
      }
    }

    // Yangilash uchun ma'lumotlarni tayyorlash
    const updateData: Partial<TaskModel> = {};

    // Faqat o'zgargan maydonlarni qo'shamiz
    if (dto.exercise_id !== undefined) updateData.exercise_id = dto.exercise_id;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.question_text !== undefined) updateData.question_text = dto.question_text;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.writing_q !== undefined) updateData.writing_q = dto.writing_q;
    if (dto.correct_answer !== undefined) updateData.correct_answer = dto.correct_answer;
    if (dto.ordinary_number !== undefined) updateData.ordinary_number = dto.ordinary_number;
    
    // extra_data - agar o'zgargan bo'lsa
    if (extraData !== undefined) updateData.extra_data = extraData;
    
    // Fayl maydonlari - agar yangi fayl bo'lsa
    if (dto.photo !== undefined) updateData.photo = dto.photo;
    if (dto.audio !== undefined) updateData.audio = dto.audio;
    if (dto.video !== undefined) updateData.video = dto.video;
    if (dto.media !== undefined) updateData.media = dto.media;

    // Agar o'chirish flaglari bo'lsa, fayllarni null qilamiz
    if (deletePhoto) updateData.photo = null;
    if (deleteAudio) updateData.audio = null;
    if (deleteVideo) updateData.video = null;
    if (deleteMedia) updateData.media = null;

    // Taskni yangilash
    await task.update(updateData);

    // Yangilangan taskni qaytarish
    return this.findOne(id);
  }

  // DELETE - Taskni o'chirish
  async delete(id: number) {
    const task = await this.findOne(id);


     await StudentAnswerModel.update(
    { task_id: null },
    { where: { task_id: id } }
  );

    // Taskga tegishli fayllarni o'chirish
    const filesToDelete = [task.photo, task.audio, task.video, task.media];
    for (const file of filesToDelete) {
      if (file) {
        await this.deleteOldFile(file);
      }
    }

    await task.destroy();
    return { message: 'Task muvaffaqiyatli o‘chirildi', id };
  }

  // Exercise bo'yicha tasklar
  async getTasksByExercise(exerciseId: number) {
    await this.exerciseModel.findByPk(exerciseId, { rejectOnEmpty: true });

    return this.taskModel.findAll({
      where: { exercise_id: exerciseId },
      order: [['ordinary_number', 'ASC'], ['id', 'ASC']],
      include: [{ model: StudentAnswerModel, required: false }],
    });
  }
}