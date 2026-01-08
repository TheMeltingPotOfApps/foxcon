import { Controller, Post, Body, HttpCode, HttpStatus, Get, Put, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('login-from-marketplace')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async loginFromMarketplace(
    @CurrentUser() user: any,
    @Body('tenantId') tenantId: string,
  ) {
    return this.authService.loginFromMarketplace(user.userId || user.sub, tenantId);
  }

  @Get('check-linked-marketplace')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async checkLinkedMarketplace(
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    return this.authService.checkLinkedMarketplaceAccount(user.userId || user.sub, tenantId);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('complete-signup')
  @HttpCode(HttpStatus.OK)
  async completeSignup(@Body() completeSignupDto: CompleteSignupDto) {
    return this.authService.completeSignup(completeSignupDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getUserProfile(user.userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updates: Partial<{ firstName: string; lastName: string; timezone: string }>,
  ) {
    return this.authService.updateUserProfile(user.userId, updates);
  }
}

