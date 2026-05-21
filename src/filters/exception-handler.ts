import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import sequelize from 'sequelize';

@Catch()
export class ExceptionHandlerFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();
        const requestTime = new Date().toISOString();
        const method = request.method;
        const url = request.url;
        const body = request.body || {};

        console.error(`[${requestTime}] ${method} ${url} - XATOLIK:`);
        console.error('  Message:', exception?.message || exception?.toString() || 'Unknown error');

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            if (status >= 500) {
                console.error('  Stack:', exception.stack);
                if (body && Object.keys(body).length > 0) {
                    console.error('  Body:', JSON.stringify(body).slice(0, 500));
                }
            }
            return response.status(status).json({
                message: exception.message,
                requestTime,
                url: request.url,
                errorName: exception.name,
                statusCode: status,
            });
        }

        if (exception instanceof sequelize.UniqueConstraintError) {
            console.error('  Sequelize unique error');
            return response.status(400).json({
                message: exception.message,
                requestTime,
                url: request.url,
                error: 'Duplicate value',
                errorName: exception.name,
            });
        }

        console.error('  Unhandled error stack:', exception?.stack || 'No stack trace');

        return response.status(500).json({
            message: exception?.message || 'Internal server error',
            requestTime,
            url: request.url,
            errorName: exception?.name,
            statusCode: 500,
        });
    }
}
