import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

export interface ReceiptData {
  academyName: string;
  logo?: string;
  address?: string;
  phones: string[];
  website?: string;
  instagram?: string;
  telegramBot?: string;
  telegramChannel?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  googleMaps?: string;
  receiptNumber: string;
  date: string;
  time: string;
  adminName: string;
  studentName: string;
  studentPhone: string;
  studentPassword?: string;
  groupName: string;
  paidMonths: string[];
  paymentType: string;
  amount: number;
  discount: number;
  penalty: number;
  total: number;
  note?: string;
  footerText?: string;
  receiptNote?: string;
  thankYouText?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  qrVerifyUrl?: string;
}

export interface PrinterConfig {
  connectionType: 'usb' | 'lan';
  ipAddress?: string;
  port?: number;
  usbDeviceName?: string;
  autoCut: boolean;
  cashDrawer: boolean;
  receiptWidth: number;
  qrSize: number;
}

@Injectable()
export class EscposService {
  private readonly logger = new Logger(EscposService.name);

  generateReceipt(data: ReceiptData, config: PrinterConfig): Buffer {
    const chunks: Buffer[] = [];
    const w = config.receiptWidth || 48;

    const write = (text: string, encoding: BufferEncoding = 'ascii') => {
      chunks.push(Buffer.from(text + '\n', encoding));
    };

    const writeCenter = (text: string) => {
      const padding = Math.max(0, Math.floor((w - text.length) / 2));
      write(' '.repeat(padding) + text);
    };

    const writeDivider = (char: string = '=') => {
      write(char.repeat(w));
    };

    const writeKeyValue = (key: string, value: string) => {
      const line = `${key}${value}`;
      if (line.length > w) {
        write(line.substring(0, w));
      } else {
        write(line);
      }
    };

    // Initialize printer
    chunks.push(Buffer.from([0x1B, 0x40])); // ESC @ - Initialize

    // Line spacing
    chunks.push(Buffer.from([0x1B, 0x32])); // ESC 2 - default line spacing

    // ---- LOGO ----
    if (data.logo) {
      try {
        const logoBuffer = this.loadLogo(data.logo, w);
        if (logoBuffer) chunks.push(logoBuffer);
      } catch { }
    }

    // ---- HEADER ----
    chunks.push(Buffer.from([0x1B, 0x61, 0x01])); // ESC a 1 - Center align
    chunks.push(Buffer.from([0x1B, 0x21, 0x08])); // ESC ! 8 - Double height
    writeCenter(data.academyName.toUpperCase());
    chunks.push(Buffer.from([0x1B, 0x21, 0x00])); // ESC ! 0 - Normal

    if (data.receiptHeader) {
      chunks.push(Buffer.from([0x1B, 0x61, 0x01]));
      data.receiptHeader.split('\n').forEach(l => writeCenter(l.trim()));
    }

    write('');
    writeDivider('=');
    write('');

    // ---- CONTACT INFO ----
    chunks.push(Buffer.from([0x1B, 0x61, 0x00])); // Left align
    chunks.push(Buffer.from([0x1B, 0x21, 0x01])); // ESC ! 1 - Bold
    data.phones.forEach(p => {
      if (p) write(`  Tel: ${p}`);
    });
    if (data.website) write(`  Web: ${data.website}`);
    if (data.instagram) write(`  IG: ${data.instagram}`);
    if (data.telegramBot) write(`  TG: ${data.telegramBot}`);
    chunks.push(Buffer.from([0x1B, 0x21, 0x00])); // Bold off
    write('');
    writeDivider('-');
    write('');

    // ---- RECEIPT NUMBER & DATE ----
    chunks.push(Buffer.from([0x1B, 0x61, 0x00]));
    writeKeyValue('  Receipt No: ', data.receiptNumber);
    writeKeyValue('  Date: ', data.date);
    writeKeyValue('  Time: ', data.time);
    writeKeyValue('  Admin: ', data.adminName);
    write('');
    writeDivider('-');
    write('');

    // ---- STUDENT INFO ----
    chunks.push(Buffer.from([0x1B, 0x21, 0x01]));
    write('  STUDENT');
    chunks.push(Buffer.from([0x1B, 0x21, 0x00]));
    writeKeyValue('  Name: ', data.studentName);
    if (data.studentPhone) writeKeyValue('  Phone: ', data.studentPhone);
    if (data.groupName) writeKeyValue('  Group: ', data.groupName);
    write('');

    // ---- PAYMENT DETAILS ----
    chunks.push(Buffer.from([0x1B, 0x21, 0x01]));
    write('  PAYMENT');
    chunks.push(Buffer.from([0x1B, 0x21, 0x00]));

    if (data.paidMonths.length > 0) {
      write('  Months:');
      data.paidMonths.forEach(m => write(`    - ${m}`));
    }

    writeKeyValue('  Type: ', data.paymentType);
    write('');
    writeDivider('-');
    write('');

    // ---- AMOUNTS ----
    chunks.push(Buffer.from([0x1B, 0x61, 0x01]));
    const fmt = (n: number) => Math.floor(n).toLocaleString();
    writeCenter(`Amount: ${fmt(data.amount)} so'm`);
    if (data.discount > 0) writeCenter(`Discount: -${fmt(data.discount)} so'm`);
    if (data.penalty > 0) writeCenter(`Penalty: +${fmt(data.penalty)} so'm`);
    write('');
    chunks.push(Buffer.from([0x1B, 0x21, 0x38])); // ESC ! 56 - Double height + Double width + Bold
    writeCenter(`TOTAL: ${fmt(data.total)} so'm`);
    chunks.push(Buffer.from([0x1B, 0x21, 0x00]));
    write('');

    // ---- NOTE ----
    if (data.receiptNote) {
      chunks.push(Buffer.from([0x1B, 0x61, 0x00]));
      write(`  Note: ${data.receiptNote}`);
    }

    writeDivider('=');
    write('');

    // ---- THANK YOU ----
    chunks.push(Buffer.from([0x1B, 0x61, 0x01]));
    const thankYou = data.thankYouText || 'Thank you! Visit again.';
    writeCenter(thankYou);
    write('');

    // ---- FOOTER ----
    if (data.receiptFooter) {
      data.receiptFooter.split('\n').forEach(l => writeCenter(l.trim()));
    }
    if (data.footerText) {
      data.footerText.split('\n').forEach(l => writeCenter(l.trim()));
    }

    write('');
    writeDivider('=');

    // ---- QR CODES ----
    if (data.qrVerifyUrl) {
      write('');
      chunks.push(Buffer.from([0x1B, 0x61, 0x01]));
      writeCenter('Verify Receipt');
      chunks.push(this.generateQR(data.qrVerifyUrl, config.qrSize || 3));
    }

    if (data.telegramBot) {
      write('');
      chunks.push(Buffer.from([0x1B, 0x61, 0x01]));
      writeCenter('Telegram Bot');
      chunks.push(this.generateQR(data.telegramBot, config.qrSize || 3));
    }

    if (data.website) {
      write('');
      chunks.push(Buffer.from([0x1B, 0x61, 0x01]));
      writeCenter('Website');
      chunks.push(this.generateQR(data.website, config.qrSize || 3));
    }

    if (data.instagram) {
      write('');
      chunks.push(Buffer.from([0x1B, 0x61, 0x01]));
      writeCenter('Instagram');
      chunks.push(this.generateQR(data.instagram, config.qrSize || 3));
    }

    write('');
    writeDivider('=');

    // ---- CUT PAPER ----
    if (config.autoCut) {
      chunks.push(Buffer.from([0x1D, 0x56, 0x00])); // GS V 0 - Cut paper
    }

    // ---- CASH DRAWER ----
    if (config.cashDrawer) {
      chunks.push(Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA])); // ESC p 0 25 250
    }

    return Buffer.concat(chunks);
  }

  generateQR(data: string, size: number = 3): Buffer {
    const chunks: Buffer[] = [];

    // GS ( k pL pH cn fn n1 n2 - QR Code model 2
    const contentLength = data.length + 3;
    const pL = contentLength & 0xFF;
    const pH = (contentLength >> 8) & 0xFF;

    // Function 165: Store QR data
    chunks.push(Buffer.from([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]));
    chunks.push(Buffer.from(data, 'ascii'));

    // Function 167: Print QR
    const modelByte = 0x32; // Model 2
    const moduleSize = Math.min(Math.max(size, 1), 8);
    chunks.push(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, moduleSize]));
    chunks.push(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30]));

    return Buffer.concat(chunks);
  }

  private loadLogo(logoPath: string, maxWidth: number): Buffer | null {
    try {
      if (logoPath.startsWith('http')) return null;

      const fullPath = path.resolve(logoPath);
      if (!fs.existsSync(fullPath)) return null;

      // For ESC/POS we use NV bitmap (GS L / GS 8 L) or raster format
      // Read image and convert to ESC/POS bitmap format
      const imgBuffer = fs.readFileSync(fullPath);

      // GS v 0 - Print raster bit image
      // We need to convert the image to a monochrome bitmap
      // For simplicity, we return null for now (full implementation would use jimp/sharp)
      return null;
    } catch {
      return null;
    }
  }

  async printViaLAN(data: ReceiptData, config: PrinterConfig): Promise<void> {
    const buffer = this.generateReceipt(data, config);

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let timeout: NodeJS.Timeout;

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.write(buffer, (err) => {
          if (err) {
            socket.destroy();
            reject(new Error(`Failed to send data to printer: ${err.message}`));
            return;
          }
          socket.end();
          resolve();
        });
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Printer connection error: ${err.message}`));
      });

      socket.on('close', () => {
        clearTimeout(timeout);
      });

      timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Printer connection timeout'));
      }, 10000);

      socket.connect(config.port || 9100, config.ipAddress || '');
    });
  }

  async testConnection(config: PrinterConfig): Promise<boolean> {
    if (config.connectionType === 'lan') {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        let timeout: NodeJS.Timeout;

        socket.on('connect', () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve(true);
        });

        socket.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });

        timeout = setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, 5000);

        socket.connect(config.port || 9100, config.ipAddress || '');
      });
    }
    return false;
  }

  generateTestPage(config: PrinterConfig): Buffer {
    const testData: ReceiptData = {
      academyName: 'TEST PRINT',
      phones: ['+998 00 000 00 00'],
      website: 'https://test.uz',
      receiptNumber: 'TEST-000001',
      date: new Date().toLocaleDateString('uz-UZ'),
      time: new Date().toLocaleTimeString('uz-UZ'),
      adminName: 'Test Admin',
      studentName: 'Test Student',
      studentPhone: '+998 00 000 00 00',
      groupName: 'Test Group',
      paidMonths: ['January', 'February'],
      paymentType: 'Test',
      amount: 100000,
      discount: 0,
      penalty: 0,
      total: 100000,
      thankYouText: 'Printer is working correctly!',
    };

    const receipt = this.generateReceipt(testData, config);
    const testQR = Buffer.concat([
      Buffer.from('\n'),
      this.generateQR('https://test.uz/verify/test123', config.qrSize || 3),
      Buffer.from('\n'),
    ]);
    return Buffer.concat([receipt, testQR]);
  }
}
