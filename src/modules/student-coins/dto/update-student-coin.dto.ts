import { PartialType } from '@nestjs/swagger';
import { CreateStudentCoinDto } from './create-student-coin.dto';

export class UpdateStudentCoinDto extends PartialType(CreateStudentCoinDto) {}
