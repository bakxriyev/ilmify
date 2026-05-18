import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupLessonDto } from './create-group-lesson.dto';

export class UpdateGroupLessonDto extends PartialType(CreateGroupLessonDto) {}
