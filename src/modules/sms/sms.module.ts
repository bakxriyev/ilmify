import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { SmsLogModel } from './entities/sms-log.entity';
import { SmsTemplateModel } from './entities/sms-template.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([SmsLogModel, SmsTemplateModel]),
  ],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
