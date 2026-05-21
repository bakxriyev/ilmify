import { appConfig, databaseConfig } from './config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SequelizeModule } from '@nestjs/sequelize';
import { UnitModel, UnitModule } from './modules/units';
import {GroupModel, GroupStudentModel, RedoIncorrectTaskModel, StudentModel, VocabAnswerModel, VocabModel, VocabResultModel } from './modules';
import { TeacherModule } from './modules/teachers';
import { StudentModule } from './modules/students';
import { GroupModule } from './modules/groups';
import { GroupStudentModule } from './modules/group_student_model';
import { AttendanceModule } from './modules/attendence/attendence.module';
import { ExerciseModule } from './modules/exercises/exercises.module';
import { TaskModule } from './modules/tasks/tasks.module';
import { StudentAnswerModule } from './modules/student-answer/student-answer.module';
import { ExercisesResultModule } from './modules/exercises_result/exercises_result.module';
import { UnitResultModule } from './modules/unit_result/unit_result.module';
import { VocabularyModule } from './modules/vocabulary';
import { VocabResultModule } from './modules/vocab_result';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth';
import { TeacherModel } from './modules/teachers';
import { LevelModule } from './modules/level/level.module';
import { LevelModel } from './modules/level/model/level.entity';
import { ExerciseModel } from './modules/exercises/model/exercise.entity';
import { RedoIncorrectTaskModule } from './modules/redo-incorrect-task';
import { TasksAnswerModule } from './modules/tasks_answer/tasks_answer.module';
import { VocabularyAnswerModule } from './modules/vocabulary_answer/vocabulary_answer.module';
import { UserDeviceModule } from './modules/user_device/user_device.module';
import { UserDeviceModel } from './modules/user_device/entities/user_device.entity';
import {TaskModel} from './modules/tasks/model/task.entity'
import { StudentAnswerModel } from './modules/student-answer/model';
import { GroupLessonModule } from './modules/group-lesson/group-lesson.module';
import {GroupLessonModel} from './modules/group-lesson/entities/group-lesson.entity'
import { AdminModule } from './modules/admin/admin.module';
import { AdminModel } from './modules/admin/model/admin.entity';
import { StoryModule } from './modules/story/story.module';
import { NewsModule } from './modules/news/news.module';
import { UnitResultModel } from './modules/unit_result/model/unit_result.entity';
import { ExerciseResultModel } from './modules/exercises_result/model/exercises_result.entity';
import { CoinsModule } from './modules/student-coins/student-coins.module';
import { StudentCoinsModel } from './modules/student-coins/entities/student-coin.entity';
import { TeacherCoinLogModel } from './modules/student-coins/entities/teacher-coin-log.entity';
import { TaskCoinLogModel } from './modules/student-coins/entities/task-coin-log.entity';
import { ShopModule } from './modules/shop/shop.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AttendanceModel } from './modules/attendence/model/attendence.entity';
import { ChatModule } from './modules/chat/chat.module';
import { ChatRoomModel } from './modules/chat/entities/chat-room.entity';
import { ChatMessageModel } from './modules/chat/entities/chat-message.entity';
import { MessageStatusModel } from './modules/chat/entities/message-status.entity';
import { RoomModule } from './modules/rooms/room.module';
import { RoomModel } from './modules/rooms/entities/room.entity';
import { ParentModule } from './modules/parents/parent.module';
import { ParentModel } from './modules/parents/entities/parent.entity';
import { ParentStudentModel } from './modules/parents/entities/parent-student.entity';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PaymentModule } from './modules/payments/payment.module';
import { PaymentModel } from './modules/payments/entities/payment.entity';
import { LeadModule } from './modules/leads/lead.module';
import { LeadModel } from './modules/leads/entities/lead.entity';
import { LeadSourceModule } from './modules/lead-sources/lead-source.module';
import { LeadSourceModel } from './modules/lead-sources/entities/lead-source.entity';
import { EducationCenterModule } from './modules/education-centers/education-center.module';
import { EducationCenterModel } from './modules/education-centers/entities/education-center.entity';
import { CenterBranchModel } from './modules/education-centers/entities/center-branch.entity';
import { TariffModule } from './modules/tariffs/tariff.module';
import { TariffModel } from './modules/tariffs/entities/tariff.entity';
import { TelegramModule } from './modules/telegram/telegram.module';
import { TelegramSettingsModel } from './modules/telegram/entities/telegram-settings.entity';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import { TelegramBotModel } from './modules/telegram-bot/entities/telegram-bot.entity';
import { TelegramChatModel } from './modules/telegram-bot/entities/telegram-chat.entity';
import { TelegramMessageModel } from './modules/telegram-bot/entities/telegram-message.entity';
import { TelegramTemplateModel } from './modules/telegram-bot/entities/telegram-template.entity';
import { TelegramBroadcastModel } from './modules/telegram-bot/entities/telegram-broadcast.entity';
import { AutoNotificationModule } from './modules/auto-notification/auto-notification.module';
import { AutoNotificationConfigModel } from './modules/auto-notification/entities/auto-notification-config.entity';
import { AutoNotificationLogModel } from './modules/auto-notification/entities/auto-notification-log.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'secret123',
      signOptions: { expiresIn: '1d' },
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        try {
          return {
            dialect: 'postgres',
            host: config.get<string>('databaseConfig.host'),
            port: config.get<number>('databaseConfig.port'),
            username: config.get<string>('databaseConfig.user'),
            password: config.get<string>('databaseConfig.password'),
            database: config.get<string>('databaseConfig.dbname'),
            models: [TariffModel, TeacherModel,LevelModel,AdminModel,UserDeviceModel,GroupLessonModel,RedoIncorrectTaskModel, StudentModel,GroupModel,GroupStudentModel,AttendanceModel,UnitModel,ExerciseModel,TaskModel,StudentAnswerModel,ExerciseResultModel,VocabModel,VocabAnswerModel,VocabResultModel,UnitResultModel,StudentCoinsModel,TeacherCoinLogModel,TaskCoinLogModel,ChatRoomModel,ChatMessageModel,MessageStatusModel,ParentModel,ParentStudentModel,RoomModel,PaymentModel,EducationCenterModel,CenterBranchModel,LeadModel,LeadSourceModel,TelegramSettingsModel,TelegramBotModel,TelegramChatModel,TelegramMessageModel,TelegramTemplateModel,TelegramBroadcastModel,AutoNotificationConfigModel,AutoNotificationLogModel],
            sync: { alter: true },
            synchronize: true,
            logging: console.log,
            autoLoadModels: true,
          };
        } catch (error) {
          console.error(
            'Error occurred while connecting to the database',
            error,
          );
          throw error;
        }
      }
    }),
    ChatModule,
    AdminModule,
    UserDeviceModule,
    AuthModule,
    StudentModule,
    TeacherModule,
    LevelModule,
    UnitModule,
    ExerciseModule,
    TaskModule,
    VocabularyModule,
    GroupModule,
    GroupStudentModule,
    AttendanceModule,
    StudentAnswerModule,
    ExercisesResultModule,
    UnitResultModule,
    VocabResultModule,
    RedoIncorrectTaskModule,
    TasksAnswerModule,
    VocabularyAnswerModule,
    GroupLessonModule,
    StoryModule,
    NewsModule,
    CoinsModule,
    ShopModule,
    NotificationModule,
    ParentModule,
    RoomModule,
    DashboardModule,
    PaymentModule,
    LeadModule,
    LeadSourceModule,
    TariffModule,
    EducationCenterModule,
    TelegramModule,
    TelegramBotModule,
    AutoNotificationModule,
  ],
  controllers: [
  ],
})
export class AppModule {}
