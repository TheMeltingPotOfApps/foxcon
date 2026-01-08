import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId || request.headers['x-tenant-id'];

    // Attach tenantId to request for use in services
    if (tenantId) {
      request.tenantId = tenantId;
    }

    return next.handle();
  }
}

