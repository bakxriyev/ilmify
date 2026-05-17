import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CenterId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.center_id;
  },
);
