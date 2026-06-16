import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { SmsLogModel } from './entities/sms-log.entity';
import { SmsTemplateModel } from './entities/sms-template.entity';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { GroupModel } from '../groups/model/group.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([SmsLogModel, SmsTemplateModel, StudentModel, TeacherModel, GroupModel, EducationCenterModel]),
  ],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
