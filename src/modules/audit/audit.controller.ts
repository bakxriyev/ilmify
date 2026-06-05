import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Audit loglarini olish' })
  @ApiResponse({ status: 200, description: 'Audit loglar ro\'yxati' })
  async findAll(@Query() query: QueryAuditDto, @Req() req?: any) {
    return this.auditService.findAll(query, req?.center_id);
  }

  @Get('actions')
  @ApiOperation({ summary: 'Barcha action turlarini olish' })
  async getActions() {
    return this.auditService.getActions();
  }

  @Get('entity-types')
  @ApiOperation({ summary: 'Barcha entity_type larni olish' })
  async getEntityTypes() {
    return this.auditService.getEntityTypes();
  }
}
