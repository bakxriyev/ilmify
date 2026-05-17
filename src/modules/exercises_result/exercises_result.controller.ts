import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ExerciseResultService } from './exercises_result.service';

@Controller('exercise-results')
export class ExerciseResultController {
  constructor(private readonly exerciseResultService: ExerciseResultService) {}

  // GET exercise result
  @Get(':exerciseId/student/:studentId')
  async getResult(
    @Param('studentId') student_id: number,
    @Param('exerciseId') exercise_id: number,
  ) {
    return this.exerciseResultService.getExerciseResult(student_id, exercise_id);
  }

  // POST task answer
  @Post(':exerciseId/student/:studentId/task/:taskId')
  async upsertTaskAnswer(
    @Param('studentId') student_id: number,
    @Param('exerciseId') exercise_id: number,
    @Param('taskId') task_id: number,
    @Body() body: { answer_text: any; is_correct: boolean; total_corrects: number; total_incorrects: number; unit_id: number },
  ) {
    return this.exerciseResultService.upsertTaskAnswer(
      student_id,
      body.unit_id,
      exercise_id,
      task_id,
      body.answer_text,
      body.is_correct,
      body.total_corrects,
      body.total_incorrects,
    );
  }
}