import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { MarketplaceAuthService } from './marketplace-auth.service';
import { MarketplaceSignupDto } from './dto/marketplace-signup.dto';
import { MarketplaceLoginDto } from './dto/marketplace-login.dto';
import { MarketplaceAuthGuard } from './guards/marketplace-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('marketplace/auth')
export class MarketplaceAuthController {
  constructor(private readonly authService: MarketplaceAuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: MarketplaceSignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  async login(@Body() loginDto: MarketplaceLoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('login-from-engine')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async loginFromEngine(
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    return this.authService.loginFromEngine(user.userId || user.sub, tenantId);
  }

  @Get('check-linked-account')
  @UseGuards(MarketplaceAuthGuard)
  async checkLinkedAccount(@Req() req: any) {
    return this.authService.checkLinkedEngineAccount(req.marketplaceUserId);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(MarketplaceAuthGuard)
  async logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }
}

