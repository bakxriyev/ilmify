import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { StudentAnswerService } from './student-answer.service';

@Controller('student-answers')
export class StudentAnswerController {
  constructor(private readonly service: StudentAnswerService) {}

  // answer create
  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  // best task result
 @Get('task/:taskId/student/:studentId/best')
getBest(
  @Param('taskId') taskId: number,
  @Param('studentId') studentId: number,
) {
  return this.service.getBestResult(taskId, studentId);
}


  // create exercise result
  @Post('exercise-result')
createExerciseResult(@Body() body: { student_id: number; exercise_id: number }) {
  return this.service.getExerciseResult(body.student_id, body.exercise_id);
}


  // realtime exercise result
  @Get('exercise/:exerciseId/student/:studentId')
  getExercise(
    @Param('exerciseId') exerciseId: number,
    @Param('studentId') studentId: number,
  ) {
    return this.service.getExerciseResult(studentId, exerciseId);
  }
}
