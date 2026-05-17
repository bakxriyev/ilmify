import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';

import { UnitModel } from '../../units/model/unit.entity';
import { StudentModel } from '../../students/model/student.entity';
import { ExerciseModel } from '../../exercises/model/exercise.entity';
import { TaskModel } from '../../tasks/model/task.entity';

@Table({
  tableName: 'tasks_answer',
  timestamps: false,
})
export class TasksAnswerModel extends Model<TasksAnswerModel> {
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

  @ForeignKey(() => StudentModel)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  student_id: number;

  @BelongsTo(() => StudentModel)
  student: StudentModel;

  @ForeignKey(() => ExerciseModel)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  exercises_id: number;

  @BelongsTo(() => ExerciseModel)
  exercise: ExerciseModel;

  @ForeignKey(() => TaskModel)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  tasks_id: number;

  @BelongsTo(() => TaskModel)
  task: TaskModel;

  // ---------- FIELDS ----------

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  tasks: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  user_answer: string;

  @Column({
    type: DataType.ENUM('true', 'false'),
    allowNull: false,
    defaultValue: 'false',
  })
  is_correct: 'true' | 'false';
}
