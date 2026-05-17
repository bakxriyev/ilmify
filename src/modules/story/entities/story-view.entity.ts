import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { StoryModel } from './story.entity';

@Table({ tableName: 'story_views', timestamps: true })
export class StoryViewModel extends Model {
  @ForeignKey(() => StoryModel)
  @Column({ type: DataType.INTEGER })
  story_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  viewer_id: number; // student yoki teacher ID
}