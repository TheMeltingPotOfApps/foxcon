import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MarketplaceUser, MarketplaceUserType } from './entities/marketplace-user.entity';
import { MarketplaceRefreshToken } from './entities/marketplace-refresh-token.entity';
import { MarketplaceSignupDto } from './dto/marketplace-signup.dto';
import { MarketplaceLoginDto } from './dto/marketplace-login.dto';
import { Logger } from '@nestjs/common';
import { AccountLinkingService } from '../account-linking/account-linking.service';

@Injectable()
export class MarketplaceAuthService {
  private readonly logger = new Logger(MarketplaceAuthService.name);

  constructor(
    @InjectRepository(MarketplaceUser)
    private readonly marketplaceUserRepository: Repository<MarketplaceUser>,
    @InjectRepository(MarketplaceRefreshToken)
    private readonly refreshTokenRepository: Repository<MarketplaceRefreshToken>,
    private readonly jwtService: JwtService,
    private readonly accountLinkingService: AccountLinkingService,
  ) {}

  async signup(signupDto: MarketplaceSignupDto) {
    // Check if user already exists
    const existingUser = await this.marketplaceUserRepository.findOne({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate storefront slug uniqueness if provided
    if (signupDto.storefrontSlug) {
      const existingSlug = await this.marketplaceUserRepository.findOne({
        where: { storefrontSlug: signupDto.storefrontSlug },
      });

      if (existingSlug) {
        throw new ConflictException('Storefront slug already taken');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(signupDto.password, 10);

    // Generate storefront slug if not provided
    const storefrontSlug =
      signupDto.storefrontSlug ||
      (signupDto.companyName
        ? this.generateSlug(signupDto.companyName)
        : this.generateSlug(signupDto.email));

    // Create user
    const user = this.marketplaceUserRepository.create({
      email: signupDto.email,
      passwordHash,
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      userType: signupDto.userType,
      companyName: signupDto.companyName,
      storefrontSlug,
      isActive: true,
      emailVerified: false,
    });

    const savedUser = await this.marketplaceUserRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser.id, savedUser.email);

    this.logger.log(`New marketplace user created: ${savedUser.email}`);

    return {
      ...tokens,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        userType: savedUser.userType,
        companyName: savedUser.companyName,
        storefrontSlug: savedUser.storefrontSlug,
      },
    };
  }

  async login(loginDto: MarketplaceLoginDto) {
    const user = await this.marketplaceUserRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    this.logger.log(`Marketplace user logged in: ${user.email}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        companyName: user.companyName,
        storefrontSlug: user.storefrontSlug,
        isVerified: user.isVerified,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['marketplaceUser'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.refreshTokenRepository.remove(tokenRecord);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = tokenRecord.marketplaceUser;

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Update last used
    tokenRecord.lastUsedAt = new Date();
    await this.refreshTokenRepository.save(tokenRecord);

    // Generate new tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return tokens;
  }

  async logout(refreshToken: string) {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (tokenRecord) {
      await this.refreshTokenRepository.remove(tokenRecord);
    }

    return { message: 'Logged out successfully' };
  }

  async validateUser(userId: string): Promise<MarketplaceUser | null> {
    const user = await this.marketplaceUserRepository.findOne({
      where: { id: userId, isActive: true },
    });

    return user || null;
  }

  private async generateTokens(userId: string, email: string) {
    const payload = {
      sub: userId,
      email,
      type: 'marketplace',
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.createRefreshToken(userId);

    return {
      accessToken,
      refreshToken: refreshToken.token,
    };
  }

  private async createRefreshToken(userId: string): Promise<MarketplaceRefreshToken> {
    const token = this.generateRandomToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const refreshToken = this.refreshTokenRepository.create({
      marketplaceUserId: userId,
      token,
      expiresAt,
    });

    return await this.refreshTokenRepository.save(refreshToken);
  }

  private generateRandomToken(): string {
    return require('crypto').randomBytes(64).toString('hex');
  }

  async loginFromEngine(engineUserId: string, tenantId: string) {
    // Check if engine user has a linked marketplace account
    const marketplaceUser = await this.accountLinkingService.getLinkedMarketplaceUser(
      engineUserId,
      tenantId,
    );

    if (!marketplaceUser) {
      throw new NotFoundException('No linked marketplace account found');
    }

    if (!marketplaceUser.isActive) {
      throw new UnauthorizedException('Linked marketplace account is inactive');
    }

    // Generate marketplace tokens
    const tokens = await this.generateTokens(marketplaceUser.id, marketplaceUser.email);

    this.logger.log(`Marketplace user logged in from engine: ${marketplaceUser.email}`);

    return {
      ...tokens,
      user: {
        id: marketplaceUser.id,
        email: marketplaceUser.email,
        firstName: marketplaceUser.firstName,
        lastName: marketplaceUser.lastName,
        userType: marketplaceUser.userType,
        companyName: marketplaceUser.companyName,
        storefrontSlug: marketplaceUser.storefrontSlug,
        isVerified: marketplaceUser.isVerified,
      },
    };
  }

  async checkLinkedEngineAccount(marketplaceUserId: string) {
    const link = await this.accountLinkingService.getAccountLink(
      undefined,
      marketplaceUserId,
    );

    if (!link) {
      return { linked: false };
    }

    return {
      linked: true,
      engineUserId: link.engineUserId,
      engineTenantId: link.engineTenantId,
    };
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);
  }
}

