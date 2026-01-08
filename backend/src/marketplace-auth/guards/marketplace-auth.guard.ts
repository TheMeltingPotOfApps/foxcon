import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MarketplaceAuthService } from '../marketplace-auth.service';

@Injectable()
export class MarketplaceAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: MarketplaceAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      // Verify token is marketplace type
      if (payload.type !== 'marketplace') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Validate user exists and is active
      const user = await this.authService.validateUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found or inactive');
      }

      request['marketplaceUser'] = user;
      request['marketplaceUserId'] = user.id;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

