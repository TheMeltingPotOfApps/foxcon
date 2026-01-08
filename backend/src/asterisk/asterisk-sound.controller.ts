import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AsteriskSoundService } from './asterisk-sound.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { UploadAudioMetadataDto } from './dto/upload-audio.dto';
import { promises as fs } from 'fs';
import * as path from 'path';

@Controller('asterisk-sounds')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AsteriskSoundController {
  constructor(private readonly asteriskSoundService: AsteriskSoundService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'audio/wav',
          'audio/mpeg',
          'audio/mp3',
          'audio/x-wav',
          'audio/basic',
          'audio/ogg',
          'audio/webm',
          'audio/x-m4a',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimes.join(', ')}`), false);
        }
      },
    }),
  )
  async uploadAudio(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: UploadAudioMetadataDto,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const result = await this.asteriskSoundService.uploadRecording(file, {
      name: metadata.name,
      description: metadata.description,
      addToFreePBX: metadata.addToFreePBX || false,
    });

    return {
      success: true,
      ...result,
    };
  }

  @Get('list')
  async listCustomSounds(@TenantId() tenantId: string) {
    const sounds = await this.asteriskSoundService.listCustomSounds();
    return {
      success: true,
      data: sounds,
    };
  }

  @Get('monitor')
  async getMonitorRecordings(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const recordings = await this.asteriskSoundService.getMonitorRecordings(
      limit ? parseInt(limit, 10) : 100,
    );
    return {
      success: true,
      data: recordings,
    };
  }

  @Get(':id/stream')
  async streamAudioFile(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = await this.asteriskSoundService.getAudioFilePath(id);
      const stats = await fs.stat(filePath);
      const mimeType = this.asteriskSoundService.getMimeType(filePath);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);

      // Stream the file
      const { createReadStream } = await import('fs');
      const stream = createReadStream(filePath);
      stream.pipe(res);

      // Clean up temp file if FreePBX (though we don't support it)
      stream.on('end', () => {
        if (id.startsWith('freepbx_')) {
          fs.unlink(filePath).catch(() => {
            // Ignore cleanup errors
          });
        }
      });

      stream.on('error', (error) => {
        res.status(500).json({ error: 'Failed to stream file', message: error.message });
      });
    } catch (error: any) {
      if (error.status === 404) {
        res.status(404).json({ error: 'Audio file not found', message: error.message });
      } else {
        res.status(500).json({ error: 'Failed to stream audio file', message: error.message });
      }
    }
  }

  @Delete(':id')
  async deleteRecording(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.asteriskSoundService.deleteRecording(id);
    return {
      success: true,
      message: 'Recording deleted successfully',
    };
  }

  @Post('reload')
  async reloadAsterisk(@TenantId() tenantId: string) {
    const success = await this.asteriskSoundService.reloadAsterisk();
    return {
      success,
      message: success ? 'Asterisk reloaded successfully' : 'Failed to reload Asterisk',
    };
  }
}

