import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../entities/system-config.entity';

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);
  private configCache: Map<string, string> = new Map();

  constructor(
    @InjectRepository(SystemConfig)
    private systemConfigRepository: Repository<SystemConfig>,
  ) {}

  async onModuleInit() {
    // Load all configs into cache on startup
    await this.loadConfigs();
    
    // Ensure ElevenLabs API key is set (force update to use the new key)
    await this.ensureKey(
      'ELEVENLABS_API_KEY',
      'sk_19bea30867d32c94012c0e8d758e264d57e37e2bb26f1fa4',
      'ElevenLabs API key for text-to-speech generation',
      true, // Force update to ensure we use the new key
    );
    
    // Ensure Anthropic API key is set (force update to use the new key)
    await this.ensureKey(
      'ANTHROPIC_API_KEY',
      process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY_HERE',
      'Anthropic Claude API key for AI generation',
      true, // Force update to ensure we use the new key
    );
  }

  async loadConfigs(): Promise<void> {
    const configs = await this.systemConfigRepository.find({
      where: { isActive: true },
    });
    this.configCache.clear();
    configs.forEach((config) => {
      this.configCache.set(config.key, config.value);
    });
    this.logger.debug(`Loaded ${configs.length} configs into cache`);
  }

  // Public method to reload configs (useful for refreshing after updates)
  async reloadConfigs(): Promise<void> {
    await this.loadConfigs();
  }

  async get(key: string): Promise<string | null> {
    // Check cache first
    if (this.configCache.has(key)) {
      return this.configCache.get(key) || null;
    }

    // If not in cache, fetch from DB
    const config = await this.systemConfigRepository.findOne({
      where: { key, isActive: true },
    });

    if (config) {
      this.configCache.set(key, config.value);
      return config.value;
    }

    return null;
  }

  async getConfig(key: string): Promise<{ key: string; value: string; description?: string } | null> {
    const config = await this.systemConfigRepository.findOne({
      where: { key, isActive: true },
    });

    if (config) {
      this.configCache.set(key, config.value);
      return {
        key: config.key,
        value: config.value,
        description: config.description,
      };
    }

    return null;
  }

  async set(key: string, value: string, description?: string): Promise<void> {
    let config = await this.systemConfigRepository.findOne({
      where: { key },
    });

    if (config) {
      config.value = value;
      if (description) config.description = description;
      config.isActive = true; // Ensure it's active
    } else {
      config = this.systemConfigRepository.create({
        key,
        value,
        description,
        isActive: true,
      });
    }

    await this.systemConfigRepository.save(config);
    // Update cache immediately
    this.configCache.set(key, value);
    this.logger.log(`Config updated: ${key} (cache refreshed)`);
  }

  async ensureKey(key: string, defaultValue: string, description?: string, forceUpdate: boolean = false): Promise<void> {
    const existing = await this.systemConfigRepository.findOne({
      where: { key },
    });

    // If forceUpdate is true, update the value even if it exists
    if (forceUpdate && existing) {
      existing.value = defaultValue;
      if (description) existing.description = description;
      existing.isActive = true;
      await this.systemConfigRepository.save(existing);
      this.configCache.set(key, defaultValue);
      this.logger.log(`Force updated config: ${key}`);
      return;
    }

    // Only set default if key doesn't exist - don't overwrite existing values
    if (!existing) {
      await this.set(key, defaultValue, description);
    } else if (description && existing.description !== description) {
      // Only update description if provided and different
      existing.description = description;
      await this.systemConfigRepository.save(existing);
    }
  }
}

