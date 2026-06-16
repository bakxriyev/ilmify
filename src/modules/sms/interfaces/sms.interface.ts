export enum SmsStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export enum SmsTemplateCategory {
  PAYMENT_REMINDER = 'payment_reminder',
  LESSON_START = 'lesson_start',
  GROUP_ACCEPTANCE = 'group_acceptance',
  EXAM_RESULT = 'exam_result',
  ATTENDANCE = 'attendance',
  GENERAL = 'general',
  LOGIN_CREDENTIALS = 'login_credentials',
  DEBT_REMINDER = 'debt_reminder',
}

export enum RecipientType {
  SINGLE_STUDENT = 'single_student',
  ALL_STUDENTS = 'all_students',
  SINGLE_TEACHER = 'single_teacher',
  ALL_TEACHERS = 'all_teachers',
  GROUP_STUDENTS = 'group_students',
  SELECTED_STUDENTS = 'selected_students',
}

export interface SmsTemplate {
  id: string;
  category: SmsTemplateCategory;
  title: string;
  body: string;
  variables: string[];
}

export interface EskizTokenResponse {
  token: string;
  expires_at?: string;
}

export interface EskizSendResponse {
  id: string;
  status: string;
  message: string;
}

export interface EskizStatusResponse {
  id: string;
  status: string;
  delivered_at?: string;
  error?: string;
}

export interface OtpEntry {
  code: string;
  phone: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}
