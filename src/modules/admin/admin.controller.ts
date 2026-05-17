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
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PhoneLoginDto } from './dto/login-admin.dto';
import { ChangePasswordDto } from './dto/change-password.admin';
import { RefreshTokenDto } from './dto/refresh-token';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  // PATCH /admin/:id - Admin ma'lumotlarini yangilash
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