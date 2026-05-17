import { Controller, Get, Param } from '@nestjs/common';
import { UnitResultService } from './unit_result.service';

@Controller('unit-results')
export class UnitResultController {
  constructor(private readonly unitResultService: UnitResultService) {}

  @Get(':studentId/:unitId')
  getResult(
    @Param('studentId') studentId: number,
    @Param('unitId') unitId: number,
  ) {
    return this.unitResultService.getUnitResult(studentId, unitId);
  }
}