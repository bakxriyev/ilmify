import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PaymentModel } from '../payments/entities/payment.entity';
import { ExpenseModel } from '../expenses/entities/expense.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { GroupStudentModel } from '../group_student_model';

@Module({
  imports: [
    SequelizeModule.forFeature([PaymentModel, ExpenseModel, StudentModel, GroupModel, EducationCenterModel, GroupStudentModel]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
