import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'news', timestamps: true })
export class NewsModel extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @Column({ type: DataType.STRING, allowNull: true })
  media_url: string; // faqat file nomi

  @Column({ type: DataType.DATE, allowNull: true })
  news_date?: Date;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  createdAt: Date;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  updatedAt: Date;
}