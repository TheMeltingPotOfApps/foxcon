import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoicePreset } from '../entities/voice-preset.entity';
import { CreateVoicePresetDto, UpdateVoicePresetDto } from './dto/create-voice-preset.dto';

@Injectable()
export class VoicePresetsService {
  private readonly logger = new Logger(VoicePresetsService.name);

  constructor(
    @InjectRepository(VoicePreset)
    private voicePresetRepository: Repository<VoicePreset>,
  ) {}

  async create(tenantId: string, dto: CreateVoicePresetDto): Promise<VoicePreset> {
    // If this is set as default, unset other defaults for this tenant
    if (dto.isDefault) {
      await this.voicePresetRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    const preset = this.voicePresetRepository.create({
      ...dto,
      tenantId,
      voiceConfig: {
        stability: dto.voiceConfig?.stability ?? 0.5,
        similarityBoost: dto.voiceConfig?.similarityBoost ?? 0.75,
        style: dto.voiceConfig?.style ?? 0.0,
        useSpeakerBoost: dto.voiceConfig?.useSpeakerBoost ?? true,
        speed: dto.voiceConfig?.speed ?? 1.0,
        speedVariance: dto.voiceConfig?.speedVariance ?? 0.0,
      },
      tags: dto.tags || [],
      isActive: dto.isActive ?? true,
    });

    return this.voicePresetRepository.save(preset);
  }

  async findAll(tenantId: string): Promise<VoicePreset[]> {
    return this.voicePresetRepository.find({
      where: { tenantId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<VoicePreset> {
    const preset = await this.voicePresetRepository.findOne({
      where: { id, tenantId },
    });

    if (!preset) {
      throw new NotFoundException(`Voice preset with ID ${id} not found`);
    }

    return preset;
  }

  async findDefault(tenantId: string): Promise<VoicePreset | null> {
    return this.voicePresetRepository.findOne({
      where: { tenantId, isDefault: true, isActive: true },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateVoicePresetDto,
  ): Promise<VoicePreset> {
    const preset = await this.findOne(tenantId, id);

    // If this is set as default, unset other defaults for this tenant
    if (dto.isDefault && !preset.isDefault) {
      await this.voicePresetRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(preset, {
      ...dto,
      voiceConfig: dto.voiceConfig
        ? {
            ...preset.voiceConfig,
            ...dto.voiceConfig,
          }
        : preset.voiceConfig,
    });

    return this.voicePresetRepository.save(preset);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const preset = await this.findOne(tenantId, id);
    await this.voicePresetRepository.remove(preset);
  }

  async setDefault(tenantId: string, id: string): Promise<VoicePreset> {
    // Unset all other defaults
    await this.voicePresetRepository.update(
      { tenantId, isDefault: true },
      { isDefault: false },
    );

    // Set this one as default
    const preset = await this.findOne(tenantId, id);
    preset.isDefault = true;
    return this.voicePresetRepository.save(preset);
  }
}
