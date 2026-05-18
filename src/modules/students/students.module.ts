import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule } from '@nestjs/jwt';
import { StudentService } from './students.service';
import { StudentController } from './students.controller';
import { StudentModel } from './model/student.entity';
import { ParentModel } from '../parents/entities/parent.entity';
import { ParentStudentModel } from '../parents/entities/parent-student.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { TariffModel } from '../tariffs/entities/tariff.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([StudentModel, ParentModel, ParentStudentModel, EducationCenterModel, TariffModel]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret123',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
