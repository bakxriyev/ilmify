import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherAttendanceLocationDto } from './create-location.dto';

export class UpdateTeacherAttendanceLocationDto extends PartialType(CreateTeacherAttendanceLocationDto) {}
