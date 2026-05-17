import { Injectable, NotFoundException, ConflictException, UnauthorizedException, Inject, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AdminModel, AdminRole } from './model/admin.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PhoneLoginDto } from './dto/login-admin.dto';
import { ChangePasswordDto } from './dto/change-password.admin';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(AdminModel)
    private adminModel: typeof AdminModel,
    private jwtService: JwtService,
  ) {}

  // Barcha adminlarni olish
  async findAll() {
    return await this.adminModel.findAll({
      attributes: { exclude: ['password', 'refresh_token'] },
    });
  }

  // ID bo'yicha admin topish
  async findOne(id: number) {
    const admin = await this.adminModel.findByPk(id, {
      attributes: { exclude: ['password', 'refresh_token'] },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    return admin;
  }

  // Email bo'yicha admin topish
  async findByEmail(email: string) {
    return await this.adminModel.findOne({
      where: { email },
    });
  }

  // Phone number bo'yicha admin topish
  async findByPhone(phone_number: string) {
    return await this.adminModel.findOne({
      where: { phone_number },
    });
  }

  // Token bo'yicha admin topish
  async findByToken(refreshToken: string) {
    return await this.adminModel.findOne({
      where: { refresh_token: refreshToken },
    });
  }

  // Token generatsiya qilish
  private generateTokens(admin: AdminModel) {
    const payload = { 
      sub: admin.id, 
      email: admin.email,
      phone_number: admin.phone_number,
      full_name: admin.full_name,
      role: admin.role,
      center_id: admin.center_id,
    };

    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '15m',
    });

    const refresh_token = crypto.randomBytes(40).toString('hex');
    
    return { access_token, refresh_token };
  }

  // Yangi admin yaratish
  async create(createAdminDto: CreateAdminDto) {
    return this.createAdmin(createAdminDto, createAdminDto.role || AdminRole.ADMIN);
  }

  async setupSuperAdmin(dto: CreateAdminDto) {
    const existing = await this.adminModel.findOne({ where: { role: AdminRole.SUPER_ADMIN } });
    if (existing) throw new ConflictException('Super admin allaqachon mavjud');
    return this.createAdmin(dto, AdminRole.SUPER_ADMIN);
  }

  private async createAdmin(createAdminDto: CreateAdminDto, role: AdminRole) {
    const existingAdminByEmail = await this.findByEmail(createAdminDto.email);
    if (existingAdminByEmail) throw new ConflictException('Admin with this email already exists');

    const existingAdminByPhone = await this.findByPhone(createAdminDto.phone_number);
    if (existingAdminByPhone) throw new ConflictException('Admin with this phone number already exists');

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    const admin = await this.adminModel.create({
      ...createAdminDto,
      password: hashedPassword,
      role,
      last_login: null,
    });

    const { password, refresh_token, ...adminWithoutPassword } = admin.toJSON();
    return adminWithoutPassword;
  }

  // Admin ma'lumotlarini yangilash
  async update(id: number, updateAdminDto: UpdateAdminDto) {
    const admin = await this.adminModel.findByPk(id);
    
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Agar email yangilanayotgan bo'lsa, mavjudligini tekshirish
    if (updateAdminDto.email && updateAdminDto.email !== admin.email) {
      const existingAdmin = await this.findByEmail(updateAdminDto.email);
      if (existingAdmin) {
        throw new ConflictException('Admin with this email already exists');
      }
    }

    // Agar phone number yangilanayotgan bo'lsa, mavjudligini tekshirish
    if (updateAdminDto.phone_number && updateAdminDto.phone_number !== admin.phone_number) {
      const existingAdmin = await this.findByPhone(updateAdminDto.phone_number);
      if (existingAdmin) {
        throw new ConflictException('Admin with this phone number already exists');
      }
    }

    // Agar parol yangilanayotgan bo'lsa, hash qilish
    if (updateAdminDto.password) {
      updateAdminDto.password = await bcrypt.hash(updateAdminDto.password, 10);
    }

    await admin.update(updateAdminDto);
    
    // Parolni response'dan olib tashlash
    const { password, refresh_token, ...adminWithoutPassword } = admin.toJSON();
    return adminWithoutPassword;
  }

  // Adminni o'chirish
  async remove(id: number) {
    const admin = await this.adminModel.findByPk(id);
    
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    await admin.destroy();
    return { message: `Admin with ID ${id} has been deleted` };
  }

  // Phone number va password orqali login
  async loginWithPhone(phoneLoginDto: PhoneLoginDto) {
    const admin = await this.adminModel.findOne({
      where: { phone_number: phoneLoginDto.phone_number },
      include: [{ model: EducationCenterModel }],
    });

    if (!admin) throw new UnauthorizedException('Telefon yoki parol notog\'ri');

    const isPasswordValid = await bcrypt.compare(phoneLoginDto.password, admin.password);
    if (!isPasswordValid) throw new UnauthorizedException('Telefon yoki parol notog\'ri');

    const center = (admin as any).center;

    // Super admin har doim kira oladi
    if (admin.role !== AdminRole.SUPER_ADMIN) {
      if (!center) throw new ForbiddenException('Siz hech qanday o\'quv markaziga biriktirilmagansiz');
      if (!center.is_active) throw new ForbiddenException('O\'quv markazi faol emas');
    }

    // Tokenlarni generatsiya qilish
    const tokens = this.generateTokens(admin);
    
    // Refresh tokenni saqlash va last_login ni yangilash
    await admin.update({
      refresh_token: tokens.refresh_token,
      last_login: new Date(),
    });

    // Parolni response'dan olib tashlash
    const { password, refresh_token, ...adminWithoutPassword } = admin.toJSON();
    
    return {
      message: 'Login successful',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      admin: {
        ...adminWithoutPassword,
        role: admin.role || 'admin',
        center_id: admin.center_id,
        center: center ? {
          id: center.id,
          name: center.name,
          balance: center.balance,
          is_active: center.is_active,
          logo: center.logo,
          location: center.location,
          phone: center.phone,
        } : null,
      },
    };
  }

  // Refresh token orqali yangi access token olish
  async refreshToken(refreshToken: string) {
    const admin = await this.findByToken(refreshToken);
    
    if (!admin) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Yangi tokenlarni generatsiya qilish
    const tokens = this.generateTokens(admin);
    
    // Yangi refresh tokenni saqlash
    await admin.update({
      refresh_token: tokens.refresh_token,
    });

    return {
      message: 'Token refreshed successfully',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  // Logout (refresh tokenni o'chirish)
  async logout(id: number) {
    const admin = await this.adminModel.findByPk(id);
    
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    await admin.update({
      refresh_token: null,
    });

    return { message: 'Logout successful' };
  }

  // Parolni tekshirish
  async validatePassword(email: string, password: string): Promise<boolean> {
    const admin = await this.findByEmail(email);
    if (!admin) {
      return false;
    }
    return await bcrypt.compare(password, admin.password);
  }

  // Parolni o'zgartirish
  async changePassword(id: number, changePasswordDto: ChangePasswordDto) {
    const admin = await this.adminModel.findByPk(id);
    
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Joriy parolni tekshirish
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.current_password, 
      admin.password
    );
    
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Yangi parolni hash qilish va saqlash
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.new_password, 10);
    await admin.update({ password: hashedNewPassword });

    return { message: 'Password changed successfully' };
  }

  // Adminlar sonini olish
  async getAdminCount() {
    const count = await this.adminModel.count();
    return { total_admins: count };
  }

  // Profil ma'lumotlarini olish (auth bo'lgan admin uchun)
  async getProfile(id: number) {
    const admin = await this.adminModel.findByPk(id, {
      attributes: { exclude: ['password', 'refresh_token'] },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    return admin;
  }
}