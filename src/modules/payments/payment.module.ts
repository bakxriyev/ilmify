import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentCronService } from './payment-cron.service';
import { PaymentModel } from './entities/payment.entity';
import { StudentModel } from '../students/model/student.entity';
import { GroupModel } from '../groups/model/group.entity';
import { GroupStudentModel } from '../group_student_model';
import { GroupLessonModel } from '../group-lesson/entities/group-lesson.entity';
import { ParentStudentModel } from '../parents/entities/parent-student.entity';
import { ParentModel } from '../parents/entities/parent.entity';
import { NotificationModule } from '../notification/notification.module';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { TelegramChatModel } from '../telegram-bot/entities/telegram-chat.entity';
import { ReceiptModel } from '../receipt/entities/receipt.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([PaymentModel, StudentModel, GroupModel, GroupStudentModel, GroupLessonModel, ParentStudentModel, ParentModel, EducationCenterModel, TelegramChatModel, ReceiptModel]),
    NotificationModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentCronService],
  exports: [PaymentService],
})
export class PaymentModule {}
