import { Injectable, NotFoundException, ConflictException, UnauthorizedException, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AdminModel, AdminRole } from './model/admin.entity';
import { EducationCenterModel } from '../education-centers/entities/education-center.entity';
import { EducationCenterService } from '../education-centers/education-center.service';
import { AuditService } from '../audit/audit.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PhoneLoginDto } from './dto/login-admin.dto';
import { ChangePasswordDto } from './dto/change-password.admin';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(AdminModel)
    private adminModel: typeof AdminModel,
    private jwtService: JwtService,
    private educationCenterService: EducationCenterService,
    private auditService: AuditService,
  ) {}

  // Barcha adminlarni olish
  async findAll() {
    const admins = await this.adminModel.findAll({
      attributes: { exclude: ['password', 'refresh_token'] },
    });
    return admins.map(a => {
      const json = a.toJSON() as any;
      json.permissions = this.parsePermissions(json.permissions);
      return json;
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

    const json = admin.toJSON() as any;
    json.permissions = this.parsePermissions(json.permissions);
    return json;
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

  // Token generatsiya qilishddadsadasdsdasdas
  private generateTokens(admin: AdminModel, effectiveRole?: string) {
    const payload = { 
      sub: admin.id, 
      email: admin.email,
      phone_number: admin.phone_number,
      full_name: admin.full_name,
      role: effectiveRole || admin.role,
      center_id: admin.center_id,
    };

    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '7d',
    });

    const refresh_token = crypto.randomBytes(40).toString('hex');
    
    return { access_token, refresh_token };
  }

  // Yangi admin yaratish (super admin uchun)
  async create(createAdminDto: CreateAdminDto) {
    return this.createAdmin(createAdminDto, createAdminDto.role || AdminRole.ADMIN, createAdminDto.center_id);
  }

  async setupSuperAdmin(dto: CreateAdminDto) {
    const existing = await this.adminModel.findOne({ where: { role: AdminRole.SUPER_ADMIN } });
    if (existing) throw new ConflictException('Super admin allaqachon mavjud');
    return this.createAdmin(dto, AdminRole.SUPER_ADMIN);
  }

  private async createAdmin(createAdminDto: CreateAdminDto, role: AdminRole, center_id?: number) {
    const existingAdminByEmail = await this.findByEmail(createAdminDto.email);
    if (existingAdminByEmail) throw new ConflictException('Admin with this email already exists');

    const existingAdminByPhone = await this.findByPhone(createAdminDto.phone_number);
    if (existingAdminByPhone) throw new ConflictException('Admin with this phone number already exists');

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    const defaultPermissions = role === AdminRole.ADMIN
      ? JSON.stringify({ dashboard: false, students: false, teachers: false, parents: false, groups: false, rooms: false, payments: false, crm: false, notifications: false })
      : null;

    const admin = await this.adminModel.create({
      ...createAdminDto,
      password: hashedPassword,
      role,
      center_id: center_id || createAdminDto.center_id || null,
      permissions: defaultPermissions,
      last_login: null,
    });

    const { password, refresh_token, ...adminWithoutPassword } = admin.toJSON();
    return { ...adminWithoutPassword, permissions: this.parsePermissions(adminWithoutPassword.permissions) };
  }

  private parsePermissions(permissions: string | null): Record<string, boolean> | null {
    if (!permissions) return null;
    try { return JSON.parse(permissions); }
    catch { return null; }
  }

  // Director - o'z markazidagi adminlarni olish
  async findByCenter(center_id: number) {
    const admins = await this.adminModel.findAll({
      where: { center_id, role: AdminRole.ADMIN },
      attributes: { exclude: ['password', 'refresh_token'] },
    });
    return admins.map(a => {
      const json = a.toJSON() as any;
      json.permissions = this.parsePermissions(json.permissions);
      return json;
    });
  }

  // Director - yangi admin yaratish (markazga biriktirilgan)
  async createCenterAdmin(createAdminDto: CreateAdminDto, center_id: number) {
    const existing = await this.adminModel.findOne({ where: { phone_number: createAdminDto.phone_number } });
    if (existing) throw new ConflictException('Bu telefon raqam bilan admin allaqachon mavjud');
    return this.createAdmin(createAdminDto, AdminRole.ADMIN, center_id);
  }

  // Director - admin ruxsatlarini yangilash
  async updatePermissions(id: number, dto: UpdatePermissionsDto) {
    const admin = await this.adminModel.findByPk(id);
    if (!admin) throw new NotFoundException('Admin topilmadi');
    if (admin.role !== AdminRole.ADMIN) throw new BadRequestException('Faqat adminlar ruxsatlarini o\'zgartirish mumkin');
    await admin.update({ permissions: JSON.stringify(dto.permissions) });
    const updated = admin.toJSON() as any;
    return { ...updated, permissions: dto.permissions };
  }

  // Administrator ma'lumotlarini yangilash (director o'z adminlarini)
  async updateAdmin(id: number, updateAdminDto: UpdateAdminDto) {
    const admin = await this.adminModel.findByPk(id);
    if (!admin) throw new NotFoundException('Admin topilmadi');
    if (admin.role !== AdminRole.ADMIN) throw new BadRequestException('Faoliyat ko\'rsatilmagan');
    if (updateAdminDto.password) {
      updateAdminDto.password = await bcrypt.hash(updateAdminDto.password, 10);
    }
    await admin.update(updateAdminDto);
    const { password, refresh_token, ...rest } = admin.toJSON();
    return { ...rest, permissions: this.parsePermissions((rest as any).permissions) };
  }

  // Barcha mavjud ruxsatlar ro'yxati
  getPermissionsList() {
    return [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'students', label: 'Studentlar' },
      { key: 'teachers', label: "O'qituvchilar" },
      { key: 'parents', label: 'Ota-onalar' },
      { key: 'groups', label: 'Guruhlar' },
      { key: 'rooms', label: 'Xonalar' },
      { key: 'payments', label: "To'lovlar" },
      { key: 'crm', label: 'CRM' },
      { key: 'notifications', label: 'Bildirishnomalar' },
    ];
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
    return { ...adminWithoutPassword, permissions: this.parsePermissions((adminWithoutPassword as any).permissions) };
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

    // Login type bo'yicha role tekshirish
    const loginType = phoneLoginDto.type || 'admin';
    if (loginType === 'admin' && admin.role === AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Bu hisob super adminga tegishli. Iltimos, super admin panelidan foydalaning');
    }
    if (loginType === 'super_admin' && admin.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Bu sahifa faqat super adminlar uchun');
    }

    // Super admin har doim kira oladi
    if (admin.role !== AdminRole.SUPER_ADMIN) {
      if (!center) throw new ForbiddenException('Siz hech qanday o\'quv markaziga biriktirilmagansiz');
      if (!center.is_active) throw new ForbiddenException('O\'quv markazi faol emas');

      // Trial muddatini tekshirish
      await this.educationCenterService.checkAndEnforceTrial(center.id);

      // Qayta tekshirish (trial tugagan bo'lsa is_active false bo'ladi)
      const updatedCenter = await EducationCenterModel.findByPk(center.id, { attributes: ['is_active'] });
      if (!updatedCenter?.is_active) throw new ForbiddenException('Markaz vaqtincha bloklangan. Tarifni yangilang.');
    }

    // Backwards compatibility: eski admin (role='admin', center_id bor, permissions yo'q) → director
    const effectiveRole = (admin.role === AdminRole.ADMIN && admin.center_id && !admin.permissions)
      ? AdminRole.DIRECTOR
      : admin.role;

    // Tokenlarni generatsiya qilish (effectiveRole bilan)
    const tokens = this.generateTokens(admin, effectiveRole);
    
    // Refresh tokenni saqlash va last_login ni yangilash
    await admin.update({
      refresh_token: tokens.refresh_token,
      last_login: new Date(),
    });

    // Parolni response'dan olib tashlash
    const { password, refresh_token, ...adminWithoutPassword } = admin.toJSON();

    const effectivePermissions = effectiveRole === AdminRole.DIRECTOR
      ? null
      : this.parsePermissions(adminWithoutPassword.permissions);

    // Audit log: tizimga kirish
    this.auditService.log({
      admin_id: admin.id,
      admin_name: admin.full_name,
      action: 'login',
      entity_type: 'admin',
      entity_name: admin.full_name,
      description: `${admin.full_name} tizimga kirdi (${effectiveRole})`,
      center_id: admin.center_id || undefined,
    });

    return {
      message: 'Login successful',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      admin: {
        ...adminWithoutPassword,
        role: effectiveRole || 'admin',
        center_id: admin.center_id,
        permissions: effectivePermissions,
        center: center ? {
          id: center.id,
          name: center.name,
          balance: center.balance,
          is_active: center.is_active,
          logo: center.logo,
          location: center.location,
          phone: center.phone,
          tariff_id: center.tariff_id,
          tariff_duration: center.tariff_duration,
          tariff_price: center.tariff_price,
          tariff_started_at: center.tariff_started_at,
          tariff_ends_at: center.tariff_ends_at,
          trial_ends_at: center.trial_ends_at,
          tariff: center.tariff ? { id: center.tariff.id, name: center.tariff.name, student_min: center.tariff.student_min, student_max: center.tariff.student_max } : null,
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

    // Backwards compatibility: eski admin → director
    const effectiveRole = (admin.role === AdminRole.ADMIN && admin.center_id && !admin.permissions)
      ? AdminRole.DIRECTOR
      : admin.role;

    // Yangi tokenlarni generatsiya qilish
    const tokens = this.generateTokens(admin, effectiveRole);
    
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

    return { message: 'Logout successfully' };
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

    const json = admin.toJSON() as any;
    json.permissions = this.parsePermissions(json.permissions);
    return json;
  }

  // Jami adminlar sonini olish (director uchun - faqat o'z markazidagilar)
  async getCenterAdminCount(center_id: number) {
    return this.adminModel.count({ where: { center_id, role: AdminRole.ADMIN } });
  }
}