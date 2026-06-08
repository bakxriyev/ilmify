import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Audit loglarini olish' })
  @ApiResponse({ status: 200, description: 'Audit loglar ro\'yxati' })
  async findAll(@Query() query: QueryAuditDto, @Req() req?: any) {
    const centerId = req?.center_id || req?.user?.center_id;
    return this.auditService.findAll(query, centerId);
  }

  @Get('actions')
  @ApiOperation({ summary: 'Barcha action turlarini olish' })
  async getActions(@Req() req?: any) {
    const centerId = req?.center_id || req?.user?.center_id;
    return this.auditService.getActions(centerId);
  }

  @Get('entity-types')
  @ApiOperation({ summary: 'Barcha entity_type larni olish' })
  async getEntityTypes(@Req() req?: any) {
    const centerId = req?.center_id || req?.user?.center_id;
    return this.auditService.getEntityTypes(centerId);
  }
}
