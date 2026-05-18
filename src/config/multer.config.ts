import { diskStorage } from 'multer';
import { extname,join} from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

// Ruxsat etilgan fayl turlari
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'audio/mpeg',
];

// Dinamik papka yaratish funksiyasi (foydalanuvchi turiga qarab)
const getDestination = (req: any, file: any, cb: any) => {
  let folder = 'uploads/'; // asosiy papka

  // So‘rov yo‘lidan kelib chiqib papkani aniqlash
  if (req.route?.path?.includes('students')) {
    folder += 'students';
  } else if (req.route?.path?.includes('teachers')) {
    folder += 'teachers';
  } else if (req.route?.path?.includes('groups')) {
    folder += 'groups';
  } else if (req.route?.path?.includes('education-centers') || req.route?.path?.includes('centers')) {
    folder += 'centers';
  } else {
    folder += 'others';
  }

  // Papka mavjudligini tekshirish va yaratish
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }

  cb(null, folder);
};

// Fayl nomini yaratish
const editFileName = (req: any, file: any, cb: any) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = extname(file.originalname);
  cb(null, `file-${uniqueSuffix}${ext}`);
};

// Fayl filtratsiyasi
const fileFilter = (req: any, file: any, cb: any) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Fayl formati qo‘llab-quvvatlanmaydi'), false);
  }
};

// Umumiy multer opsiyalari
export const multerOptions = {
  storage: diskStorage({
    destination: getDestination,
    filename: editFileName,
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
  fileFilter,
};