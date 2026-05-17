
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserDeviceModel } from './entities/user_device.entity';
import { UserDeviceService } from './user_device.service';
import { UserDeviceController } from './user_device.controller';
import { StudentModel } from '../students/model/student.entity';
import { TeacherModel } from '../teachers/model/teacher.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      UserDeviceModel,
      StudentModel,
      TeacherModel,
    ]),
  ],
  controllers: [UserDeviceController],
  providers: [UserDeviceService],
  exports: [UserDeviceService],
})
export class UserDeviceModule {}