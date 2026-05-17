import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, // true faqat 465 uchun
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetCode(
    email: string,
    code: string,
    firstName: string,
  ) {
    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Parolni tiklash kodi',
      html: `
        <h2>Assalomu alaykum ${firstName}!</h2>
        <p>Parolni tiklash uchun quyidagi kodni kiriting:</p>
        <h1 style="color:#007bff;text-align:center">${code}</h1>
        <p>Kod 10 daqiqa amal qiladi.</p>
      `,
    });
  }
}
