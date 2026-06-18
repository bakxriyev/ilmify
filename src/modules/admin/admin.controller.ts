import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../../config/multer.config';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { PhoneLoginDto } from './dto/login-admin.dto';
import { ChangePasswordDto } from './dto/change-password.admin';
import { RefreshTokenDto } from './dto/refresh-token';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private getCurrentUser(req: any): { id: number; role: string; center_id?: number } {
    const authHeader = req.headers?.authorization;
    if (!authHeader) throw new UnauthorizedException('Token topilmadi');
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Noto\'g\'ri token format');
    const secrets = ['secret123', process.env.JWT_SECRET || 'secret123', process.env.JWT_ACCESS_SECRET || 'kamron'].filter(Boolean);
    for (const secret of secrets) {
      try { return jwt.verify(token, secret) as any; } catch {}
    }
    throw new UnauthorizedException('Noto\'g\'ri token');
  }

  // POST /admin/login/phone - Phone number va password orqali login
  @ApiOperation({ summary: 'Login with phone number and password' })
  @Post('login/phone')
  loginWithPhone(@Body() phoneLoginDto: PhoneLoginDto) {
    return this.adminService.loginWithPhone(phoneLoginDto);
  }

  @ApiOperation({ summary: 'Birinchi super adminni yaratish (faqat 1 marta)' })
  @Post('setup-super-admin')
  setupSuperAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.setupSuperAdmin(dto);
  }

  // POST /admin/refresh-token - Refresh token orqali yangi token olish
  @ApiOperation({ summary: 'Refresh access token' })
  @Post('refresh-token')
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.adminService.refreshToken(refreshTokenDto.refresh_token);
  }

  // POST /admin - Yangi admin yaratish
  @ApiOperation({ summary: 'Create new admin' })
  @Post()
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  // GET /admin - Barcha adminlar (faqat auth bo'lgan adminlar uchun)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admins' })
  @Get()
  findAll() {
    return this.adminService.findAll();
  }

  // GET /admin/count - Adminlar soni
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin count' })
  @Get('count')
  getAdminCount() {
    return this.adminService.getAdminCount();
  }

  // ============= DIRECTOR ENDPOINTS =============

  // GET /admin/directors/permissions-list - Barcha mavjud ruxsatlar
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all available permissions (director only)' })
  @Get('directors/permissions-list')
  getPermissionsList(@Request() req) {
    const user = this.getCurrentUser(req);
    return this.adminService.getPermissionsList();
  }

  // GET /admin/directors/admins - Director o'z markazidagi adminlar ro'yxati
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get center admins (director only)' })
  @Get('directors/admins')
  async getCenterAdmins(@Request() req) {
    const user = this.getCurrentUser(req);
    return this.adminService.findByCenter(user.center_id);
  }

  // POST /admin/directors/admins - Director yangi admin yaratadi
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new admin for center (director only)' })
  @Post('directors/admins')
  async createCenterAdmin(@Body() dto: CreateAdminDto, @Request() req) {
    const user = this.getCurrentUser(req);
    return this.adminService.createCenterAdmin(dto, user.center_id);
  }

  // GET /admin/directors/admins/:id - Admin ma'lumotlari
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin details (director only)' })
  @Get('directors/admins/:id')
  async getCenterAdmin(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const user = this.getCurrentUser(req);
    const admin = await this.adminService.findOne(id);
    if (admin.center_id !== user.center_id) throw new UnauthorizedException('Siz faqat o\'z markazingiz adminlarini ko\'ra olasiz');
    return admin;
  }

  // PATCH /admin/directors/admins/:id - Admin ma'lumotlarini yangilash
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update admin (director only)' })
  @Patch('directors/admins/:id')
  async updateCenterAdmin(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminDto, @Request() req) {
    const user = this.getCurrentUser(req);
    const admin = await this.adminService.findOne(id);
    if (admin.center_id !== user.center_id) throw new UnauthorizedException('Siz faqat o\'z markazingiz adminlarini tahrirlay olasiz');
    return this.adminService.updateAdmin(id, dto);
  }

  // PATCH /admin/directors/admins/:id/permissions - Admin ruxsatlarini yangilash
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update admin permissions (director only)' })
  @Patch('directors/admins/:id/permissions')
  async updateAdminPermissions(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermissionsDto, @Request() req) {
    const user = this.getCurrentUser(req);
    const admin = await this.adminService.findOne(id);
    if (admin.center_id !== user.center_id) throw new UnauthorizedException('Siz faqat o\'z markazingiz adminlarining ruxsatlarini o\'zgartira olasiz');
    return this.adminService.updatePermissions(id, dto);
  }

  // DELETE /admin/directors/admins/:id - Adminni o'chirish
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete admin (director only)' })
  @Delete('directors/admins/:id')
  async deleteCenterAdmin(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const user = this.getCurrentUser(req);
    const admin = await this.adminService.findOne(id);
    if (admin.center_id !== user.center_id) throw new UnauthorizedException('Siz faqat o\'z markazingiz adminlarini o\'chira olasiz');
    return this.adminService.remove(id);
  }

  // GET /admin/profile - Joriy admin profil ma'lumotlari
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin profile' })
  @Get('profile')
  getProfile(@Request() req) {
    return this.adminService.getProfile(req.user.id);
  }

  // GET /admin/:id - ID bo'yicha admin
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin by ID' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findOne(id);
  }

  // POST /admin/:id/photo - Admin rasmini yuklash (multer)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload admin photo (multipart)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { photo: { type: 'string', format: 'binary' } } } })
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo', multerOptions))
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.adminService.update(id, { photo: file.filename } as any);
  }

  // PATCH /admin/:id - Admin ma'lumotlarini yangilash (JSON)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update admin' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    return this.adminService.update(id, updateAdminDto);
  }

  // PATCH /admin/:id/change-password - Parolni o'zgartirish
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @Patch(':id/change-password')
  changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.adminService.changePassword(id, changePasswordDto);
  }

  // POST /admin/:id/logout - Logout qilish
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout admin' })

  @Post(':id/logout')
  logout(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.logout(id);
  }

  // DELETE /admin/:id - Adminni o'chirish
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete admin' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.remove(id);
  }
}