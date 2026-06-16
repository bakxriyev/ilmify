import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private warned = false;

  constructor(
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, body } = request;
    const user = request.user;

    if (method === 'GET') return next.handle();
    if (originalUrl.includes('/auth/') || originalUrl.includes('/admin/login') || originalUrl.includes('/teachers/login')) {
      return next.handle();
    }
    // Payment endpoints logged manually in payment.service.ts with full details
    if (originalUrl.startsWith('/payments') && !originalUrl.includes('/payments/check-reminders') && !originalUrl.includes('/payments/absence-notification')) {
      return next.handle();
    }

    const now = Date.now();

    return next.handle().pipe(
      switchMap(async (responseBody: any) => {
        try {
          const adminId = user?.id || user?.adminId || Number(user?.sub) || 0;
          const adminName = user?.name || user?.full_name || user?.first_name || 'Unknown';
          const centerId = request.center_id || user?.center_id || null;

          const parsed = this.parseRequest(method, originalUrl, body, responseBody);

          if (parsed) {
            try {
              await this.auditService.log({
                admin_id: adminId,
                admin_name: adminName,
                center_id: centerId,
                ...parsed,
                details: {
                  duration: `${Date.now() - now}ms`,
                  requestBody: this.sanitizeBody(body),
                },
              });
            } catch (logErr) {
              this.logger.error('Audit log error', logErr);
            }
          }
        } catch (err) {
          this.logger.error('Audit interceptor error', err);
        }

        return responseBody;
      }),
    );
  }

  private async doLog(user: any, request: any, method: string, originalUrl: string, body: any, responseBody: any, duration: number): Promise<void> {
    try {
      const adminId = user?.id || user?.adminId || Number(user?.sub) || 0;
      const adminName = user?.name || user?.full_name || user?.first_name || 'Unknown';
      const centerId = request.center_id || user?.center_id || null;

      const parsed = this.parseRequest(method, originalUrl, body, responseBody);

      if (parsed) {
        try {
          await this.auditService.log({
            admin_id: adminId,
            admin_name: adminName,
            center_id: centerId,
            ...parsed,
            details: {
              duration: `${duration}ms`,
              requestBody: this.sanitizeBody(body),
            },
          });
        } catch (logErr) {
          this.logger.error('Audit log error', logErr);
        }
      }
    } catch (err) {
      this.logger.error('Audit interceptor error', err);
    }
  }

  private emitWebSocket(centerId: number, data: any) {
    try {
      const { NotificationGateway } = require('../notification/notification.gateway');
      const server = NotificationGateway.ioServer;
      if (server) {
        server.to(`center-${centerId}`).emit('audit', data);
      } else if (!this.warned) {
        this.warned = true;
        this.logger.warn('WebSocket server not ready yet');
      }
    } catch (err) {
      if (!this.warned) {
        this.warned = true;
        this.logger.error('Failed to emit audit via WebSocket', err);
      }
    }
  }

  private parseRequest(method: string, url: string, body: any, response: any): {
    action: string;
    entity_type: string;
    entity_id?: string;
    entity_name?: string;
    description?: string;
  } | null {
    const path = url.split('?')[0].replace(/^\/+/, '');
    const segments = path.split('/');
    const entityType = this.getEntityType(segments[0]);
    if (!entityType) return null;

    const entityId = segments.length > 1 && /^\d+$/.test(segments[1]) ? segments[1] : null;

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
        {
          const labels: Record<string, string> = {
            group: 'Guruh', student: 'Student', teacher: "O'qituvchi", payment: "To'lov",
            lesson: 'Dars', room: 'Xona', lead: 'Lead', news: 'Yangilik',
            story: 'Hikoya', exercise: 'Mashq', unit: 'Unit', task: 'Topshiriq',
            vocabulary: "So'z", admin: 'Admin', parent: "Ota-ona",
            education_center: "O'quv markazi", tariff: 'Tarif',
            sms: 'SMS', auto_notification: 'Avto-bildirishnoma',
          };
          const dl = labels[entityType] || entityType;
          description = `${dl} o'chirildi${entityId ? ` (ID: ${entityId})` : ''}`;
        }
        break;
      default:
        return null;
    }

    return { action, entity_type: entityType, entity_id: entityId || undefined, entity_name: entityName, description };
  }

  private getEntityType(segment: string): string | null {
    const map: Record<string, string> = {
      groups: 'group', students: 'student', teachers: 'teacher',
      payments: 'payment', lessons: 'lesson', 'group-lessons': 'lesson',
      'group-students': 'group_student', rooms: 'room', levels: 'level',
      parents: 'parent', admins: 'admin', admin: 'admin', leads: 'lead',
      notifications: 'notification', 'auto-notification': 'auto_notification',
      news: 'news', stories: 'story', exercises: 'exercise', units: 'unit',
      tasks: 'task', vocabulary: 'vocabulary', attendance: 'attendance',
      'lead-sources': 'lead_source', tariffs: 'tariff', sms: 'sms', shop: 'shop',
      'student-coins': 'student_coin', 'student-answers': 'student_answer',
      'vocab-result': 'vocab_result', 'vocab-answers': 'vocab_answer',
      'vocabulary-answer': 'vocabulary_answer', 'tasks-answer': 'tasks_answer',
      'exercise-results': 'exercise_result', 'education-centers': 'education_center',
      'center-applications': 'center_application', 'telegram-settings': 'telegram_settings',
      'telegram-bot': 'telegram_bot', chat: 'chat', 'student-auth': 'student',
      'user-devices': 'user_device', 'redo-incorrect-tasks': 'redo_incorrect_task',
    };
    return map[segment] || segment;
  }

  private buildCreateDescription(entityType: string, body: any, response: any): string {
    const name = body?.name || body?.first_name || response?.name || '';
    const firstName = body?.first_name || response?.first_name || '';
    const lastName = body?.last_name || response?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    switch (entityType) {
      case 'group': return `Yangi guruh yaratildi: "${name}"`;
      case 'student': return `Yangi student qo'shildi: ${fullName}`;
      case 'teacher': return `Yangi o'qituvchi qo'shildi: ${fullName}`;
      case 'payment': return `Yangi to'lov yaratildi: ${body?.amount || ''} so'm`;
      case 'lesson': return `Yangi dars yaratildi: ${body?.date || ''}`;
      case 'group_student': return `Student guruhga qo'shildi: ${fullName}`;
      case 'room': return `Yangi xona yaratildi: "${name}"`;
      case 'lead': return `Yangi lead qo'shildi: ${fullName}`;
      case 'news': return `Yangi yangilik yaratildi: "${body?.title || name}"`;
      case 'story': return `Yangi hikoya yaratildi`;
      case 'exercise': return `Yangi mashq yaratildi: "${body?.title || ''}"`;
      case 'unit': return `Yangi unit yaratildi: "${body?.name || body?.title || ''}"`;
      case 'task': return `Yangi topshiriq yaratildi: "${body?.title || ''}"`;
      case 'vocabulary': return `Yangi so'z qo'shildi: "${body?.word || body?.term || ''}"`;
      case 'admin': return `Yangi admin qo'shildi: ${fullName}`;
      case 'education_center': return `Yangi o'quv markazi yaratildi: "${name}"`;
      case 'lead_source': return `Yangi lead manbai yaratildi: "${name}"`;
      case 'tariff': return `Yangi tarif yaratildi: "${name}"`;
      case 'sms': return `SMS jo'natildi`;
      case 'shop': return `Yangi mahsulot: "${body?.name || body?.title || ''}"`;
      case 'telegram_bot': return `Telegram bot sozlamasi yangilandi`;
      case 'telegram_settings': return `Telegram sozlamalari yangilandi`;
      case 'parent': return `Yangi ota-ona qo'shildi: ${fullName}`;
      default: return `Yangi ${entityType} yaratildi`;
    }
  }

  private buildUpdateDescription(entityType: string, entityId: string | null, body: any): string {
    const changedFields = body ? Object.keys(body).filter(k => body[k] !== undefined && body[k] !== null && k !== 'id') : [];
    const labelMap: Record<string, string> = {
      group: 'guruh', student: 'student', teacher: "o'qituvchi", payment: "to'lov",
      lesson: 'dars', room: 'xona', lead: 'lead', news: 'yangilik',
      story: 'hikoya', exercise: 'mashq', unit: 'unit', task: 'topshiriq',
      vocabulary: "so'z", admin: 'admin', parent: "ota-ona",
      education_center: "o'quv markazi", tariff: 'tarif',
      sms: 'SMS', auto_notification: 'avto-bildirishnoma',
    };
    const label = labelMap[entityType] || entityType;
    const fieldsStr = changedFields.length > 0 ? ` (${changedFields.join(', ')})` : '';
    return `${label} yangilandi${entityId ? ` ID:${entityId}` : ''}${fieldsStr}`;
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    const sanitized = { ...body };
    for (const field of ['password', 'token', 'access_token', 'refresh_token']) {
      if (sanitized[field]) sanitized[field] = '***';
    }
    return sanitized;
  }
}
