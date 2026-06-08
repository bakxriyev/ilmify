import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, body } = request;
    const user = request.user;

    // Skip GET requests (reading is not an action)
    if (method === 'GET') return next.handle();

    // Skip auth/login endpoints
    if (originalUrl.includes('/auth/') || originalUrl.includes('/admin/login') || originalUrl.includes('/teachers/login')) {
      return next.handle();
    }

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (responseBody: any) => {
          try {
            const duration = Date.now() - now;
            const adminId = user?.id || user?.adminId || 0;
            const adminName = user?.name || user?.full_name || user?.first_name || 'Unknown';
            const centerId = request.center_id || user?.center_id || null;

            const parsed = this.parseRequest(method, originalUrl, body, responseBody);

            if (parsed) {
              this.auditService.log({
                admin_id: adminId,
                admin_name: adminName,
                center_id: centerId,
                ...parsed,
                details: {
                  duration: `${duration}ms`,
                  requestBody: this.sanitizeBody(body),
                },
              }).catch(err => {
                this.logger.error('Failed to save audit log', err);
              });
            }
          } catch (err) {
            this.logger.error('Audit interceptor error', err);
          }
        },
        error: (err: any) => {
          // Don't log on failed requests
        },
      }),
    );
  }

  private parseRequest(method: string, url: string, body: any, response: any): {
    action: string;
    entity_type: string;
    entity_id?: string;
    entity_name?: string;
    description?: string;
  } | null {
    // Remove leading / and query params
    const path = url.split('?')[0].replace(/^\/+/, '');
    const segments = path.split('/');

    // Extract entity type from the first segment
    const entityType = this.getEntityType(segments[0]);
    if (!entityType) return null;

    // Try to extract entity ID from URL
    const entityId = segments.length > 1 && /^\d+$/.test(segments[1]) ? segments[1] : null;

    // Determine action
    let action: string;
    let description: string;
    let entityName: string | undefined;

    switch (method) {
      case 'POST':
        action = 'create';
        description = this.buildCreateDescription(entityType, body, response);
        entityName = body?.name || body?.first_name || (response?.name || response?.first_name ? `${response.first_name || ''} ${response.last_name || ''}`.trim() : undefined);
        break;
      case 'PATCH':
      case 'PUT':
        action = 'update';
        description = this.buildUpdateDescription(entityType, entityId, body);
        entityName = body?.name || body?.first_name;
        break;
      case 'DELETE':
        action = 'delete';
        description = `${entityType} o'chirildi${entityId ? ` (ID: ${entityId})` : ''}`;
        break;
      default:
        return null;
    }

    return { action, entity_type: entityType, entity_id: entityId || undefined, entity_name: entityName, description };
  }

  private getEntityType(segment: string): string | null {
    const map: Record<string, string> = {
      groups: 'group',
      students: 'student',
      teachers: 'teacher',
      payments: 'payment',
      lessons: 'lesson',
      'group-lessons': 'lesson',
      'group-students': 'group_student',
      rooms: 'room',
      levels: 'level',
      parents: 'parent',
      admins: 'admin',
      admin: 'admin',
      leads: 'lead',
      notifications: 'notification',
      'auto-notification': 'auto_notification',
      news: 'news',
      stories: 'story',
      exercises: 'exercise',
      units: 'unit',
      tasks: 'task',
      vocabulary: 'vocabulary',
      attendance: 'attendance',
    };
    return map[segment] || segment;
  }

  private buildCreateDescription(entityType: string, body: any, response: any): string {
    const name = body?.name || body?.first_name || response?.name || '';
    const firstName = body?.first_name || response?.first_name || '';
    const lastName = body?.last_name || response?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    switch (entityType) {
      case 'group':
        return `Yangi guruh yaratildi: "${name}"`;
      case 'student':
        return `Yangi student qo'shildi: ${fullName}`;
      case 'teacher':
        return `Yangi o'qituvchi qo'shildi: ${fullName}`;
      case 'payment':
        return `Yangi to'lov yaratildi: ${body?.amount || ''} so'm`;
      case 'lesson':
        return `Yangi dars yaratildi: ${body?.date || ''}`;
      case 'group_student':
        return `Student guruhga qo'shildi`;
      case 'room':
        return `Yangi xona yaratildi: "${name}"`;
      default:
        return `Yangi ${entityType} yaratildi`;
    }
  }

  private buildUpdateDescription(entityType: string, entityId: string | null, body: any): string {
    const changedFields = body ? Object.keys(body).filter(k => body[k] !== undefined && body[k] !== null) : [];
    const fieldsStr = changedFields.length > 0 ? ` (${changedFields.join(', ')})` : '';
    return `${entityType} yangilandi${entityId ? ` ID:${entityId}` : ''}${fieldsStr}`;
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'access_token', 'refresh_token'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) sanitized[field] = '***';
    }
    return sanitized;
  }
}
