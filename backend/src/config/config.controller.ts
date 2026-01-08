import { Controller, Get, Put, Body, UseGuards, Param, Logger } from '@nestjs/common';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user-role.enum';
import { ModuleRef } from '@nestjs/core';

@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OWNER)
export class ConfigController {
  private readonly logger = new Logger(ConfigController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {}

  @Get(':key')
  async getConfig(@Param('key') key: string) {
    const config = await this.configService.getConfig(key);
    return config || { key, value: null };
  }

  @Put(':key')
  async updateConfig(
    @Param('key') key: string,
    @Body() body: { value: string; description?: string },
  ) {
    this.logger.log(`Updating config: ${key}`);
    await this.configService.set(key, body.value, body.description);
    
    // Refresh ElevenLabs service if API key was updated
    if (key === 'ELEVENLABS_API_KEY') {
      try {
        const { ElevenLabsService } = await import('../elevenlabs/elevenlabs.service');
        const elevenLabsService = this.moduleRef.get(ElevenLabsService, { strict: false });
        if (elevenLabsService) {
          await elevenLabsService.refreshApiKey();
          // Verify the key was refreshed by testing it
          const refreshedKey = await elevenLabsService.getApiKey();
          if (refreshedKey === body.value) {
            this.logger.log(`✅ ElevenLabs API key refreshed successfully (length: ${refreshedKey.length})`);
          } else {
            this.logger.warn(`⚠️ ElevenLabs API key refresh may have failed. Expected length: ${body.value.length}, Got length: ${refreshedKey.length}`);
          }
        } else {
          this.logger.warn('ElevenLabsService not found in module - key will refresh on next API call');
        }
      } catch (error) {
        this.logger.error('Failed to refresh ElevenLabs service', error);
      }
    }
    
    return { key, value: body.value, success: true };
  }
}

