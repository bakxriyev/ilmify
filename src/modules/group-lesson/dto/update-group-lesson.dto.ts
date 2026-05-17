import { PartialType } from '@nestjs/swagger';
import { CreateGroupLessonDto } from './create-group-lesson.dto';

export class UpdateGroupLessonDto extends PartialType(CreateGroupLessonDto) {}
