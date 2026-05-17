import { diskStorage } from 'multer';
import { extname } from 'path';

export const shopMulterConfig = {
  storage: diskStorage({
    destination: './uploads/shop',
    filename: (req, file, callback) => {
      const name = req.body.name
        ?.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '');

      const unique = Date.now();
      const ext = extname(file.originalname);

      callback(null, `${name}-${unique}${ext}`);
    },
  }),
};