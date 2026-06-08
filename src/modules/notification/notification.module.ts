import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationModel } from './entities/notification.entity';
import { NotificationTemplateModel } from './entities/notification-template.entity';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { GroupStudentModel } from '../group_student_model';
import { GroupModel } from '../groups/model/group.entity';
import { PaymentModel } from '../payments/entities/payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      NotificationModel,
      NotificationTemplateModel,
      StudentModel,
      TeacherModel,
      GroupStudentModel,
      GroupModel,
      PaymentModel,
    ]),
  ],
  providers: [NotificationGateway, NotificationService],
  exports: [NotificationService],
  controllers: [NotificationController],
})
export class NotificationModule {}
