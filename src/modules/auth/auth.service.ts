import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { StudentModel } from '../students/model/student.entity';
import { UserDeviceModel } from '../user_device/entities/user_device.entity';
import {
  StudentLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { RedisService } from '../../services/redis.service';
import { LoginResponse } from './dto/loginResponce';
import { GroupModel } from '../groups/model/group.entity';
import { TeacherModel } from '../teachers/model/teacher.model';
import { LevelModel } from '../level/model/level.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(StudentModel)
    private studentModel: typeof StudentModel,
    
    @InjectModel(UserDeviceModel)
    private userDeviceModel: typeof UserDeviceModel,
    
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  private readonly ACCESS_TOKEN_EXPIRY = '30m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * LOGIN - HAR SAFAR YANGI DEVICE YARATISH
   */
 async login(
  loginDto: StudentLoginDto & { 
    deviceInfo?: string;
    ipAddress?: string;
  }
): Promise<LoginResponse> {
  const { phone_number, password, deviceInfo, ipAddress } = loginDto;

  console.log(`\n========== LOGIN START ==========`);
  console.log(`Phone: ${phone_number}`);

  // 1. Student topish (isActive ni ham olish uchun)
  const student = await this.studentModel.findOne({
    where: { phone_number },
    include: [
      {
        model: GroupModel,
        include: [
          { model: TeacherModel, as: 'mainTeacher', attributes: { exclude: ['password'] } },
          { model: TeacherModel, as: 'supportTeacher', attributes: { exclude: ['password'] } },
          { model: LevelModel, as: 'level' }
        ]
      },
      { model: EducationCenterModel }
    ],
    attributes: { exclude: ['password'] } // isActive bu yerda bor
  });

  if (!student) {
    console.log(`ERROR: Student not found`);
    throw new UnauthorizedException('Telefon raqami yoki parol noto\'g\'ri');
  }

  console.log(`Student found: ID ${student.id}`);
  console.log(`Student isActive: ${student.isActive}`);

  // 2. Aktivatsiya holatini tekshirish
  if (!student.isActive) {
    console.log(`ERROR: Student not activated`);
    throw new UnauthorizedException('Akkount aktivlashtirilmagan. Iltimos, akkountingizni aktivlashtiring');
  }

  // 3. Parol tekshirish
  const studentWithPassword = await this.studentModel.findByPk(student.id, { 
    attributes: ['password'] 
  });
  
  if (password !== studentWithPassword.password) {
    console.log(`ERROR: Password mismatch`);
    throw new UnauthorizedException('Telefon raqami yoki parol noto\'g\'ri');
  }

  console.log(`Password verified ✓`);

  // ========== HAR SAFAR YANGI DEVICE YARATISH ==========
  const NEW_DEVICE_ID = crypto.randomUUID();
  const NEW_JTI = crypto.randomUUID();

  console.log(`\n--- CREATING NEW SESSION ---`);
  console.log(`NEW Device ID: ${NEW_DEVICE_ID}`);
  console.log(`NEW JTI: ${NEW_JTI}`);

  // 4. Eski sessionlarni topish
  const oldSessions = await this.userDeviceModel.findAll({
    where: { 
      user_type: 'student', 
      user_id: student.id, 
      is_active: true 
    }
  });

  console.log(`\n--- CLEANING OLD SESSIONS ---`);
  console.log(`Found ${oldSessions.length} old active sessions`);

  // 5. Eski sessionlarning refresh tokenlarini o'chirish
  for (const oldSession of oldSessions) {
    const redisKey = `refresh:student:${student.id}:${oldSession.jti}`;
    await this.redisService.del(redisKey);
    console.log(`  ✓ Deleted redis: ${redisKey}`);
  }

  // 6. Eski sessionlarni deactivate qilish
  if (oldSessions.length > 0) {
    await this.userDeviceModel.update(
      { is_active: false },
      { 
        where: { 
          user_type: 'student', 
          user_id: student.id, 
          is_active: true 
        } 
      }
    );
    console.log(`  ✓ Deactivated ${oldSessions.length} old sessions`);
  }

  // 7. YANGI session yaratish
  const newSession = await this.userDeviceModel.create({
    user_type: 'student',
    user_id: student.id,
    student_id: student.id,
    device_id: NEW_DEVICE_ID,
    device_info: deviceInfo || null,
    ip_address: ipAddress || null,
    jti: NEW_JTI,
    last_active: new Date(),
    is_active: true,
  });

  console.log(`\n--- NEW SESSION CREATED ---`);
  console.log(`Session DB ID: ${newSession.id}`);
  console.log(`Device ID: ${newSession.device_id}`);
  console.log(`JTI: ${newSession.jti}`);
  console.log(`Is Active: ${newSession.is_active}`);

  // 8. Tokenlar yaratish
  const access_token = this.jwtService.sign({
    sub: student.id,
    type: 'student',
    jti: NEW_JTI,
    deviceId: NEW_DEVICE_ID,
    phone_number: student.phone_number,
  }, { expiresIn: this.ACCESS_TOKEN_EXPIRY });

  const refresh_token = this.jwtService.sign({
    sub: student.id,
    type: 'refresh',
    jti: NEW_JTI,
    deviceId: NEW_DEVICE_ID
  }, { expiresIn: this.REFRESH_TOKEN_EXPIRY });

  // 9. Refresh token ni redisga saqlash
  await this.redisService.set(
    `refresh:student:${student.id}:${NEW_JTI}`, 
    refresh_token, 
    60*60*24*7
  );

  console.log(`\n--- TOKENS GENERATED ---`);
  console.log(`Access token: ${access_token.substring(0, 50)}...`);
  console.log(`Refresh token: ${refresh_token.substring(0, 50)}...`);

  // 10. Response
  const response: LoginResponse = {
    access_token,
    refresh_token,
    device_id: NEW_DEVICE_ID,
    student: {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      phone_number: student.phone_number,
      age: student.age,
      photo: student.photo,
      isActive: student.isActive, 
      group_id: student.group_id,
      group: student.group ? {
        id: student.group.id,
        name: student.group.name,
        teacher_id: student.group.teacher_id,
        support_teacher_id: student.group.support_teacher_id,
        level_id: student.group.level_id,
        center_id: (student.group as any).center_id,
        mainTeacher: student.group.mainTeacher,
        supportTeacher: student.group.supportTeacher,
        level: student.group.level
      } : null,
      center_id: (student as any).center_id,
      center: (student as any).center ? {
        id: (student as any).center.id,
        name: (student as any).center.name,
        logo: (student as any).center.logo,
        location: (student as any).center.location,
        phone: (student as any).center.phone,
        is_active: (student as any).center.is_active,
      } : null,
    }
  };

  console.log(`\n========== LOGIN SUCCESS ==========`);
  console.log(`Returning device_id: ${response.device_id}\n`);

  return response;
}
  /**
   * REFRESH TOKEN
   */
  async refreshToken(dto: RefreshTokenDto): Promise<{ access_token: string }> {
    const { refresh_token } = dto;

    try {
      const payload = this.jwtService.verify(refresh_token);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Noto\'g\'ri token turi');
      }

      const studentId = payload.sub;
      const jti = payload.jti;
      const deviceId = payload.deviceId;

      const session = await this.userDeviceModel.findOne({
        where: {
          user_type: 'student',
          user_id: studentId,
          jti: jti,
          device_id: deviceId,
          is_active: true,
        },
      });

      if (!session) {
        throw new UnauthorizedException('Sessiya bekor qilingan');
      }

      const redisKey = `refresh:student:${studentId}:${jti}`;
      const storedRefresh = await this.redisService.get(redisKey);

      if (!storedRefresh || storedRefresh !== refresh_token) {
        throw new UnauthorizedException('Refresh token yaroqsiz');
      }

      session.last_active = new Date();
      await session.save();

      const access_token = this.jwtService.sign({
        sub: studentId,
        type: 'student',
        jti: jti,
        deviceId: deviceId,
      }, { expiresIn: this.ACCESS_TOKEN_EXPIRY });

      return { access_token };
    } catch (e) {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }
  }

  /**
   * LOGOUT
   */
  async logout(studentId: number, jti: string, deviceId: string): Promise<{ message: string }> {
    const updated = await this.userDeviceModel.update(
      { is_active: false },
      {
        where: {
          user_type: 'student',
          user_id: studentId,
          jti: jti,
          device_id: deviceId,
          is_active: true,
        },
      }
    );

    if (updated[0] === 0) {
      throw new NotFoundException('Session topilmadi');
    }

    await this.redisService.del(`refresh:student:${studentId}:${jti}`);

    return { message: 'Muvaffaqiyatli chiqib ketildi' };
  }

  /**
   * LOGOUT ALL DEVICES
   */
  async logoutAllDevices(studentId: number): Promise<{ message: string }> {
    const sessions = await this.userDeviceModel.findAll({
      where: {
        user_type: 'student',
        user_id: studentId,
        is_active: true,
      },
    });

    for (const session of sessions) {
      await this.redisService.del(`refresh:student:${studentId}:${session.jti}`);
    }

    await this.userDeviceModel.update(
      { is_active: false },
      {
        where: {
          user_type: 'student',
          user_id: studentId,
          is_active: true,
        },
      }
    );

    return { message: 'Barcha qurilmalardan chiqib ketildi' };
  }

  /**
   * GET ACTIVE SESSIONS
   */
  async getActiveSessions(studentId: number) {
    const sessions = await this.userDeviceModel.findAll({
      where: {
        user_type: 'student',
        user_id: studentId,
        is_active: true,
      },
      order: [['last_active', 'DESC']],
    });

    return sessions.map(s => ({
      id: s.id,
      device_id: s.device_id,
      device_info: s.device_info,
      ip_address: s.ip_address,
      last_active: s.last_active,
      jti: s.jti,
    }));
  }

  /**
   * REMOVE SESSION
   */
  async removeSession(studentId: number, sessionId: number): Promise<{ message: string }> {
    const session = await this.userDeviceModel.findOne({
      where: {
        id: sessionId,
        user_type: 'student',
        user_id: studentId,
        is_active: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session topilmadi');
    }

    session.is_active = false;
    await session.save();

    await this.redisService.del(`refresh:student:${studentId}:${session.jti}`);

    return { message: 'Session o\'chirildi' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const student = await this.studentModel.findOne({ 
      where: { email },
      attributes: ['id', 'email', 'first_name']
    });
    
    if (!student) {
      throw new NotFoundException('Email topilmadi');
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    await this.redisService.set(`reset_password:${email}`, resetCode, 600);

    return { 
      message: 'Kod emailga jo\'natildi',
      code: resetCode
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, code, new_password } = resetPasswordDto;
    const storedCode = await this.redisService.get(`reset_password:${email}`);

    if (!storedCode || storedCode !== code) {
      throw new BadRequestException('Kod noto\'g\'ri');
    }

    const student = await this.studentModel.findOne({ where: { email } });
    if (!student) {
      throw new NotFoundException('Student topilmadi');
    }

    await student.update({ password: new_password });
    await this.redisService.del(`reset_password:${email}`);
    await this.logoutAllDevices(student.id);

    return { message: 'Parol yangilandi' };
  }

  async setPhoto(studentId: number, file: Express.Multer.File) {
    const student = await this.studentModel.findByPk(studentId);
    if (!student) {
      throw new NotFoundException('Student topilmadi');
    }

    const fileName = `student_${studentId}_${Date.now()}_${file.originalname}`;
    const filePath = `uploads/students/${fileName}`;

    await student.update({ photo: filePath });

    return { message: 'Rasm yuklandi', photo_url: filePath };
  }

  async getProfile(studentId: number) {
    const student = await this.studentModel.findByPk(studentId, {
      include: [
        {
          model: GroupModel,
          include: [
            {
              model: TeacherModel,
              as: 'mainTeacher',
              attributes: { exclude: ['password'] }
            },
            {
              model: TeacherModel,
              as: 'supportTeacher',
              attributes: { exclude: ['password'] }
            },
            {
              model: LevelModel,
              as: 'level'
            }
          ]
        }
      ],
      attributes: { exclude: ['password'] },
    });

    if (!student) {
      throw new NotFoundException('Student topilmadi');
    }

    return student;
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      
      if (payload.type !== 'student') {
        throw new UnauthorizedException('Noto\'g\'ri token');
      }

      const session = await this.userDeviceModel.findOne({
        where: {
          user_type: 'student',
          user_id: payload.sub,
          jti: payload.jti,
          device_id: payload.deviceId,
          is_active: true,
        },
      });

      if (!session) {
        throw new UnauthorizedException('Session topilmadi');
      }

      return payload;
    } catch (e) {
      throw new UnauthorizedException('Token yaroqsiz');
    }
  }
}
