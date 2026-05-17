// src/modules/story/entities/story.entity.ts
import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { StoryViewModel } from './story-view.entity';
import { StoryLikeModel } from './story-like.entity';

@Table({ tableName: 'stories', timestamps: true })
export class StoryModel extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @Column({ type: DataType.STRING, allowNull: false })
  media_url: string; // video yoki photo fayl

  // Views
  @HasMany(() => StoryViewModel, 'story_id')
  views: StoryViewModel[];

  // Likes
  @HasMany(() => StoryLikeModel, 'story_id')
  likes: StoryLikeModel[];
}