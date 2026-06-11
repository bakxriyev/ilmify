import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BadRequestException, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { ExceptionHandlerFilter } from './filters/exception-handler';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import { join } from 'path';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      exceptionFactory(errors) {
        const messages: string[] = [];
        function extract(errs: any[]) {
          for (const e of errs) {
            if (e.constraints) messages.push(...Object.values(e.constraints) as string[]);
            if (e.children?.length) extract(e.children);
          }
        }
        extract(errors);
        throw new BadRequestException(messages.join(' && '));
      },
    }),
  );

  app.useGlobalFilters(new ExceptionHandlerFilter());

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, url } = req;
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        console.log(`[${new Date().toISOString()}] ${method} ${url} ${res.statusCode} ${duration}ms`);
      }
    });
    next();
  });

  // Center ID header middleware - admin panelidan kelgan center_id ni request ga qo'shish
  app.use((req: Request, res: Response, next: NextFunction) => {
    const centerId = req.headers['x-center-id'];
    if (centerId) {
      (req as any).center_id = Number(centerId);
    }
    next();
  });

  // JWT middleware - barcha requestlar uchun tokenni dekod qiladi va req.user ni set qiladi
  app.use((req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const secrets = ['secret123', process.env.JWT_SECRET || 'secret123', process.env.JWT_ACCESS_SECRET || 'kamron'].filter(Boolean);
      for (const secret of secrets) {
        try {
          const payload = jwt.verify(token, secret) as any;
          (req as any).user = payload;
          break;
        } catch {}
      }
    }
    next();
  });

  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-center-id', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  });

  // Katta fayllar yuklash uchun body parser limitini oshirish
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.raw({ limit: '50mb' }));

  // uploads papkasini public qilish
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  const config = new DocumentBuilder()
    .setTitle('BAKHRIYEV LC STUDENTS APP api')
    .setDescription('BAKHRIYEV LC STUDENTS APP API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(configService.get<number>('appConfig.port'), () => {
    console.log(
      `Server ${configService.get<number>('appConfig.port')} portda ishlamoqda...`,
    );
  });
}
bootstrap();
