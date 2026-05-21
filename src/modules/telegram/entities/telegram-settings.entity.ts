import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'telegram_settings', timestamps: true })
export class TelegramSettingsModel extends Model<TelegramSettingsModel> {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  bot_token: string;

  @Column({ type: DataType.TEXT, allowNull: true, defaultValue: '' })
  channel_usernames: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active: boolean;
}
