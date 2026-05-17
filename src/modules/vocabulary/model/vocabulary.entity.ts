// src/modules/vocabulary/model/vocab.entity.ts  (or similar path)

import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { UnitModel } from 'src/modules/units/model';           // adjust path if needed
import { VocabAnswerModel } from 'src/modules/vocab_answers/model';
import { VocabResultModel } from 'src/modules/vocab_result/model';

@Table({ tableName: 'vocabs', timestamps: false })
export class VocabModel extends Model<VocabModel> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ForeignKey(() => UnitModel)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  unit_id: number;

  @BelongsTo(() => UnitModel)
  unit: UnitModel;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    comment: 'English word / Inglizcha so‘z',
  })
  eng: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    comment: 'Uzbek translation / O‘zbekcha tarjimasi',
  })
  uzb: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Definition (usually in English)',
  })
  definition: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Pronunciation text or phonetic transcription',
  })
  prononciation: string;   // note: screenshot has typo "prononunsaion" → corrected to standard spelling

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Photo / image URL of the word',
  })
  photo: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Title (optional additional name/header)',
  })
  title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Longer description / additional explanation',
  })
  description: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Audio file URL for pronunciation',
  })
  audio: string;

  // Relations
  @HasMany(() => VocabAnswerModel)
  vocab_answers: VocabAnswerModel[];

  @HasMany(() => VocabResultModel)
  vocab_results: VocabResultModel[];
}