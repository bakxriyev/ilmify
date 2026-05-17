import { Table, Model, Column, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { ExerciseModel } from 'src/modules/exercises/model/exercise.entity';
import { StudentAnswerModel } from 'src/modules/student-answer/model/student-answer.entity';
// import { RedoIncorrectTaskModel } from 'src/modules/redo-incorrect-task';

@Table({ tableName: 'tasks', timestamps: false })
export class TaskModel extends Model<TaskModel> {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

   @ForeignKey(() => ExerciseModel)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  exercise_id: number;

  @BelongsTo(() => ExerciseModel)
  exercise: ExerciseModel;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  question_text: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  media: string;        

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  correct_answer: any;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  extra_data: any;        

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  photo: string;         

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  title: string;
  

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

   @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  completed_at: Date;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  answer: any;     
  
   @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  writing_q: string;     
  
  
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  ordinary_number: number; 

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  audio: string;           

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  video: string;         

   @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  options: any;         

  @HasMany(() => StudentAnswerModel)
  student_answers: StudentAnswerModel[];
}