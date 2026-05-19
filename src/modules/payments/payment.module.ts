import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentCronService } from './payment-cron.service';
import { PaymentModel } from './entities/payment.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
import { ParentStudentModel } from '../parents/entities/parent-student.entity';
import { ParentModel } from '../parents/entities/parent.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    SequelizeModule.forFeature([PaymentModel, StudentModel, GroupModel, GroupStudentModel, ParentStudentModel, ParentModel]),
    NotificationModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentCronService],
  exports: [PaymentService],
})
export class PaymentModule {}
