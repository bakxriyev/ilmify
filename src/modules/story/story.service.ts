import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StoryModel } from './entities/story.entity';
import { StoryLikeModel } from './entities/story-like.entity';
import { StoryViewModel } from './entities/story-view.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { LikeStoryDto } from './dto/like-story.dto';

@Injectable()
export class StoryService {
  constructor(
    @InjectModel(StoryModel) private storyRepo: typeof StoryModel,
    @InjectModel(StoryLikeModel) private storyLikeRepo: typeof StoryLikeModel,
    @InjectModel(StoryViewModel) private storyViewRepo: typeof StoryViewModel,
  ) {}

  // 🔹 Create story
  async createStory(dto: CreateStoryDto) {
    return this.storyRepo.create(dto as any);
  }

  // 🔹 Update story
  async updateStory(storyId: number, dto: Partial<CreateStoryDto>) {
    const story = await this.storyRepo.findByPk(storyId);
    if (!story) throw new NotFoundException('Story topilmadi');
    await story.update(dto);
    return story;
  }

  // 🔹 Delete story
  async deleteStory(storyId: number) {
    const story = await this.storyRepo.findByPk(storyId);
    if (!story) throw new NotFoundException('Story topilmadi');
    await story.destroy();
    return { message: 'Story o‘chirildi', story_id: storyId };
  }

  // 🔹 Like story
  async likeStory(storyId: number, dto: LikeStoryDto) {
    if (!dto.student_id && !dto.teacher_id) {
      throw new BadRequestException('student_id yoki teacher_id majburiy');
    }

    const story = await this.storyRepo.findByPk(storyId);
    if (!story) throw new NotFoundException('Story topilmadi');

    // Duplicate oldini olish
    const where: any = { story_id: storyId };
    if (dto.student_id) where.student_id = dto.student_id;
    if (dto.teacher_id) where.teacher_id = dto.teacher_id;

    const existing = await this.storyLikeRepo.findOne({ where });

    if (!existing) {
      await this.storyLikeRepo.create({ story_id: storyId, ...dto });
    }

    const likesCount = await this.storyLikeRepo.count({ where: { story_id: storyId } });
    return { story_id: storyId, likes: likesCount };
  }

  // 🔹 Unlike story
  async unlikeStory(storyId: number, dto: LikeStoryDto) {
    if (!dto.student_id && !dto.teacher_id) {
      throw new BadRequestException('student_id yoki teacher_id majburiy');
    }

    const where: any = { story_id: storyId };
    if (dto.student_id) where.student_id = dto.student_id;
    if (dto.teacher_id) where.teacher_id = dto.teacher_id;

    const deleted = await this.storyLikeRepo.destroy({ where });
    const likesCount = await this.storyLikeRepo.count({ where: { story_id: storyId } });
    return { story_id: storyId, deleted, likes: likesCount };
  }

  // 🔹 Add view
  async addView(storyId: number, viewerId: number) {
    const story = await this.storyRepo.findByPk(storyId);
    if (!story) throw new NotFoundException('Story topilmadi');

    await this.storyViewRepo.findOrCreate({
      where: { story_id: storyId, viewer_id: viewerId },
      defaults: { story_id: storyId, viewer_id: viewerId },
    });

    const viewsCount = await this.storyViewRepo.count({ where: { story_id: storyId } });
    return { story_id: storyId, views: viewsCount };
  }

  // 🔹 Get all stories
  async getAllStories() {
    const stories = await this.storyRepo.findAll({
      include: [StoryLikeModel, StoryViewModel],
    });

    return stories.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      media_url: s.media_url,
      likes: s.likes?.length || 0,
      views: s.views?.length || 0,
    }));
  }

  // 🔹 Single story
  async getStory(storyId: number) {
    const story = await this.storyRepo.findByPk(storyId, {
      include: [StoryLikeModel, StoryViewModel],
    });
    if (!story) throw new NotFoundException('Story topilmadi');

    return {
      id: story.id,
      title: story.title,
      description: story.description,
      media_url: story.media_url,
      likes: story.likes?.length || 0,
      views: story.views?.length || 0,
    };
  }
}