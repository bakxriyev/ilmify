import { Table, Model, Column, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { UnitModel } from 'src/modules/units/model/unit.entity';
import { TaskModel } from 'src/modules/tasks/model/task.entity';
import { ExerciseResultModel } from 'src/modules/exercises_result/model/exercises_result.entity';
import { RedoIncorrectTaskModel } from 'src/modules/redo-incorrect-task/model/redo-incorrect-task.entity';

@Table({ tableName: 'exercises', timestamps: false })
export class ExerciseModel extends Model<ExerciseModel> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  name: string;

  @ForeignKey(() => UnitModel)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  unit_id: number;

  @BelongsTo(() => UnitModel)
  unit: UnitModel;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.INTEGER,      
    allowNull: true,
  })
  number: number;

  @Column({
    type: DataType.ENUM(
      'reading',
      'gap_fill',
      'speaking',
      'writing',
      'listening',
      'test',
      'vocabulary',
      'grammar',
    'summary_c',
'summary_d','summary_choice','summary_ing','summary_no'),
    allowNull: false,
    defaultValue: 'reading',
  })
  type: 'reading' | 'gap_fill' | 'speaking' | 'writing' 
  | 'listening' | 'test' | 'vocabulary' | 'grammar' | 'summary_d' 
  | 'summary_c' | 'summary_choice' | 'summary_ing' | 'summary_no'

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'q_text',  
  })
  qText: string;

  // Relations
 @HasMany(() => TaskModel)
  tasks: TaskModel[];

  @HasMany(() => ExerciseResultModel)
  exercise_results: ExerciseResultModel[];

  @HasMany(() => RedoIncorrectTaskModel)
  redo_incorrect_tasks: RedoIncorrectTaskModel[];
}