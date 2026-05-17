import {
  Table,
  Model,
  Column,
  DataType,
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { ExerciseModel } from '../../exercises/model/exercise.entity';
import { VocabModel } from '../../vocabulary/model';
import { StudentAnswerModel } from '../../student-answer/model';
import { ExerciseResultModel } from '../../exercises_result/model';
import { UnitResultModel } from '../../unit_result/model';
import { VocabResultModel } from '../../vocab_result/model';
import { LevelModel } from '../../level/model/level.entity';
import { GroupLessonModel } from '../../group-lesson/entities/group-lesson.entity';

@Table({ tableName: 'units', timestamps: false })
export class UnitModel extends Model<UnitModel> {
  @Column({ type: DataType.BIGINT, autoIncrement: true, primaryKey: true })
  id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  unit_number: string;

  @Column({ type: DataType.STRING, allowNull: true })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @ForeignKey(() => LevelModel)
  @Column({ type: DataType.INTEGER, allowNull: true })
  level_id: number;

  @BelongsTo(() => LevelModel)
  level: LevelModel;

  @HasMany(() => ExerciseModel)
  exercises: ExerciseModel[];

  @HasMany(() => VocabModel)
  vocabs: VocabModel[];

  @HasMany(() => StudentAnswerModel)
  student_answers: StudentAnswerModel[];

  @HasMany(() => ExerciseResultModel)
  exercise_results: ExerciseResultModel[];

  @HasMany(() => UnitResultModel)
  unit_results: UnitResultModel[];

  @HasMany(() => VocabResultModel)
  vocab_results: VocabResultModel[];

  @HasMany(() => GroupLessonModel)
  lessons: GroupLessonModel[];
}