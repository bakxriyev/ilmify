import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BadRequestException, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { ExceptionHandlerFilter } from './filters/exception-handler';
import * as express from 'express';
import { join } from 'path';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory(errors) {
        const errorMsgs = errors.map((err) =>
          Object.values(err.constraints).join(', '),
        );
        throw new BadRequestException(errorMsgs.join(' && '));
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  app.useGlobalFilters(new ExceptionHandlerFilter());

  // Center ID header middleware - admin panelidan kelgan center_id ni request ga qo'shish
  app.use((req: Request, res: Response, next: NextFunction) => {
    const centerId = req.headers['x-center-id'];
    if (centerId) {
      (req as any).center_id = Number(centerId);
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
