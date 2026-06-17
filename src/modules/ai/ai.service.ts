import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  private aiBaseUrl: string;

  constructor(private config: ConfigService) {
    this.aiBaseUrl = this.config.get('AI_SERVICE_URL', 'http://localhost:8000');
  }

  async chat(message: string, token: string): Promise<any> {
    try {
      const { data } = await axios.post(
        `${this.aiBaseUrl}/api/ai/chat`,
        { message },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000,
        },
      );
      return data;
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new HttpException(
          'AI so\'rovi juda uzoq davom etdi. Iltimos, qisqaroq savol bering yoki keyinroq urinib ko\'ring.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      if (err.response) {
        throw new HttpException(
          err.response.data?.message || 'AI xizmatida xatolik',
          err.response.status || HttpStatus.BAD_GATEWAY,
        );
      }
      throw new HttpException(
        'AI xizmatiga ulanishda xatolik: ' + (err.message || 'unknown'),
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getDashboard(token: string): Promise<any> {
    try {
      const { data } = await axios.get(`${this.aiBaseUrl}/api/ai/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      });
      return data;
    } catch (err: any) {
      if (err.code === 'ECONNABORTED') {
        throw new HttpException('AI xizmati javob bermadi', HttpStatus.GATEWAY_TIMEOUT);
      }
      if (err.response) {
        throw new HttpException(
          err.response.data?.message || 'AI dashboard xatolik',
          err.response.status || HttpStatus.BAD_GATEWAY,
        );
      }
      throw new HttpException(
        'AI xizmatiga ulanishda xatolik: ' + (err.message || 'unknown'),
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getRevenueTrend(token: string): Promise<any> {
    const { data } = await axios.get(`${this.aiBaseUrl}/api/ai/dashboard/revenue-trend`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    return data;
  }

  async getStudentGrowth(token: string): Promise<any> {
    const { data } = await axios.get(`${this.aiBaseUrl}/api/ai/dashboard/student-growth`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    return data;
  }

  async getAttendanceTrend(token: string): Promise<any> {
    const { data } = await axios.get(`${this.aiBaseUrl}/api/ai/dashboard/attendance-trend`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    return data;
  }

  async getLeadConversion(token: string): Promise<any> {
    const { data } = await axios.get(`${this.aiBaseUrl}/api/ai/dashboard/lead-conversion`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    return data;
  }

  async getMonthlyComparison(token: string): Promise<any> {
    const { data } = await axios.get(`${this.aiBaseUrl}/api/ai/dashboard/monthly-comparison`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    return data;
  }

  async healthCheck(): Promise<any> {
    try {
      const { data } = await axios.get(`${this.aiBaseUrl}/api/ai/health`, { timeout: 5000 });
      return data;
    } catch {
      return { status: 'error', message: 'AI xizmati mavjud emas' };
    }
  }
}
