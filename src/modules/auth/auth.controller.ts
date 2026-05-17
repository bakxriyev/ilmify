import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { StudentAuthGuard } from '../../guards/student-auth.guard';
import {
  StudentLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Student Auth')
@Controller('api/student-auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * LOGIN - HAR SAFAR yangi device yaratiladi
   */
  @Post('login')
  @ApiOperation({ summary: 'Student login - har safar yangi device yaratiladi' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGc...',
        refresh_token: 'eyJhbGc...',
        device_id: '550e8400-e29b-41d4-a716-446655440000',
        student: {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone_number: '+998901234567',
          age: 20,
          photo: null,
          group_id: null,
          group: null
        }
      }
    }
  })
  async login(
    @Body() loginDto: StudentLoginDto,
    @Req() req: any,
  ) {
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || 
                     req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress ||
                     'Unknown IP';

    return this.authService.login({
      ...loginDto,
      deviceInfo,
      ipAddress,
    });
  }

  /**
   * REFRESH TOKEN
   */
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        access_token: 'eyJhbGc...'
      }
    }
  })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  /**
   * LOGOUT - Faqat joriy device'dan
   */
  @Post('logout')
  @UseGuards(StudentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from current device' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        message: 'Muvaffaqiyatli chiqib ketildi'
      }
    }
  })
  async logout(@Req() req: any) {
    const studentId = req.user.sub;
    const jti = req.user.jti;
    const deviceId = req.user.deviceId;
    
    return this.authService.logout(studentId, jti, deviceId);
  }

  /**
   * LOGOUT ALL - Barcha device'lardan
   */
  @Post('logout-all')
  @UseGuards(StudentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        message: 'Barcha qurilmalardan chiqib ketildi'
      }
    }
  })
  async logoutAll(@Req() req: any) {
    const studentId = req.user.sub;
    return this.authService.logoutAllDevices(studentId);
  }

  /**
   * FAOL SESSIYALARNI KO'RISH
   */
  @Get('sessions')
  @UseGuards(StudentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 1,
          device_id: '550e8400-e29b-41d4-a716-446655440000',
          device_info: 'Mozilla/5.0...',
          ip_address: '192.168.1.1',
          last_active: '2026-01-30T12:00:00.000Z',
          jti: '46e972cc-be9c-4683-9cc1-413982ebf4af'
        }
      ]
    }
  })
  async getSessions(@Req() req: any) {
    const studentId = req.user.sub;
    return this.authService.getActiveSessions(studentId);
  }

  /**
   * SPECIFIC SESSION O'CHIRISH
   */
  @Delete('sessions/:sessionId')
  @UseGuards(StudentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove specific session' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        message: 'Session o\'chirildi'
      }
    }
  })
  async removeSession(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const studentId = req.user.sub;
    return this.authService.removeSession(studentId, sessionId);
  }

  /**
   * FORGOT PASSWORD
   */
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset code' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        message: 'Kod emailga jo\'natildi',
        code: '123456'
      }
    }
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /**
   * RESET PASSWORD
   */
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with code' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        message: 'Parol yangilandi'
      }
    }
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * GET PROFILE
   */
  @Get('profile')
  @UseGuards(StudentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student profile' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone_number: '+998901234567',
        age: 20,
        photo: null,
        group_id: null,
        group: null
      }
    }
  })
  async getProfile(@Req() req: any) {
    const studentId = req.user.sub;
    return this.authService.getProfile(studentId);
  }

  /**
   * SET PHOTO
   */
  @Post('photo')
  @UseGuards(StudentAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Upload student photo' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        message: 'Rasm yuklandi',
        photo_url: 'uploads/students/student_1_1234567890_photo.jpg'
      }
    }
  })
  async setPhoto(
    @Req() req: any, 
    @UploadedFile() file: Express.Multer.File
  ) {
    const studentId = req.user.sub;
    return this.authService.setPhoto(studentId, file);
  }
}