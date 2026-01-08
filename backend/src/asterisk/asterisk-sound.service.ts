import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface UploadMetadata {
  name?: string;
  description?: string;
  addToFreePBX?: boolean;
}

export interface ConvertedFiles {
  wav: string;
  ulaw: string;
  alaw: string;
  gsm: string;
  sln16: string;
}

export interface AudioFileInfo {
  name: string;
  path: string;
  size: number;
  format: string;
  createdAt: Date;
}

@Injectable()
export class AsteriskSoundService {
  private readonly logger = new Logger(AsteriskSoundService.name);
  private readonly customSoundsDir: string;
  private readonly monitorDir: string;
  private readonly uploadDir: string;

  constructor(
    private configService: ConfigService,
  ) {
    // Get directories from config or use defaults
    this.customSoundsDir = this.configService.get<string>('ASTERISK_SOUNDS_DIR') || '/var/lib/asterisk/sounds/custom';
    this.monitorDir = this.configService.get<string>('ASTERISK_MONITOR_DIR') || '/var/spool/asterisk/monitor';
    this.uploadDir = this.configService.get<string>('UPLOAD_SOUNDS_DIR') || path.join(process.cwd(), 'uploads', 'sounds');

    // Ensure upload directory exists
    this.ensureDirectoryExists(this.uploadDir);
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.log(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Upload and convert audio file for Asterisk
   */
  async uploadRecording(
    file: Express.Multer.File,
    metadata: UploadMetadata = {},
  ): Promise<{
    id: string;
    originalName: string;
    safeName: string;
    formats: ConvertedFiles;
    metadata: UploadMetadata;
  }> {
    const { originalname, buffer, mimetype } = file;

    // Validate file type
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

    if (!allowedMimes.includes(mimetype)) {
      throw new BadRequestException(`Invalid file type: ${mimetype}. Allowed types: ${allowedMimes.join(', ')}`);
    }

    // Generate file ID and safe name
    const fileId = crypto.randomBytes(8).toString('hex');
    const safeName = originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const baseFileName = `upload_${fileId}_${safeName}`;

    // Save original file
    const originalPath = path.join(this.uploadDir, baseFileName);
    await fs.writeFile(originalPath, buffer);

    this.logger.log(`Saved original file: ${originalPath}`);

    // Convert to Asterisk-compatible formats
    const convertedFiles = await this.convertToAsteriskFormats(
      originalPath,
      metadata.name || safeName,
    );

    // Optionally add to FreePBX recordings (read-only - we only read from FreePBX, don't modify)
    if (metadata.addToFreePBX) {
      this.logger.warn('FreePBX integration requires database access. Implement separately if needed.');
      // Note: FreePBX integration would require direct database access
      // This is intentionally not implemented to avoid modifying FreePBX code
    }

    // Clean up original file after conversion
    try {
      await fs.unlink(originalPath);
    } catch (error) {
      this.logger.warn(`Failed to delete original file: ${error.message}`);
    }

    return {
      id: fileId,
      originalName: originalname,
      safeName: baseFileName,
      formats: convertedFiles,
      metadata,
    };
  }

  /**
   * Convert audio file to Asterisk-compatible formats using sox
   */
  async convertToAsteriskFormats(
    sourcePath: string,
    baseName: string,
  ): Promise<ConvertedFiles> {
    // Clean base name for file system
    const cleanBaseName = baseName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    // Ensure custom sounds directory exists
    await this.ensureDirectoryExists(this.customSoundsDir);

    const formats: Partial<ConvertedFiles> = {};

    try {
      // Convert to WAV (8kHz, mono, 16-bit PCM)
      const wavPath = path.join(this.customSoundsDir, `${cleanBaseName}.wav`);
      await execAsync(`sox "${sourcePath}" -r 8000 -c 1 -b 16 "${wavPath}"`);
      formats.wav = wavPath;
      this.logger.log(`Converted to WAV: ${wavPath}`);

      // Convert to μ-law
      const ulawPath = path.join(this.customSoundsDir, `${cleanBaseName}.ul`);
      await execAsync(`sox "${wavPath}" -e u-law "${ulawPath}"`);
      formats.ulaw = ulawPath;

      // Convert to A-law
      const alawPath = path.join(this.customSoundsDir, `${cleanBaseName}.al`);
      await execAsync(`sox "${wavPath}" -e a-law "${alawPath}"`);
      formats.alaw = alawPath;

      // Convert to GSM
      const gsmPath = path.join(this.customSoundsDir, `${cleanBaseName}.gsm`);
      await execAsync(`sox "${wavPath}" -r 8000 -c 1 "${gsmPath}"`);
      formats.gsm = gsmPath;

      // Convert to SLN16
      const sln16Path = path.join(this.customSoundsDir, `${cleanBaseName}.sln16`);
      await execAsync(`sox "${sourcePath}" -r 16000 -c 1 -t raw -e signed-integer -b 16 "${sln16Path}"`);
      formats.sln16 = sln16Path;

      // Set proper permissions (readable by asterisk user)
      const files = [wavPath, ulawPath, alawPath, gsmPath, sln16Path];
      for (const file of files) {
        try {
          await fs.chmod(file, 0o644);
          // Try to change ownership to asterisk user if running as root
          try {
            const { execSync } = require('child_process');
            execSync(`chown asterisk:asterisk "${file}"`, { stdio: 'ignore' });
          } catch (chownError) {
            // Ignore chown errors (may not be running as root)
            this.logger.debug(`Could not change ownership of ${file} (this is OK if not running as root)`);
          }
        } catch (error) {
          this.logger.warn(`Failed to set permissions on ${file}: ${error.message}`);
        }
      }

      return formats as ConvertedFiles;
    } catch (error: any) {
      this.logger.error(`Audio conversion failed: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Failed to convert audio file. Ensure sox is installed: apt-get install sox libsox-fmt-all. Error: ${error.message}`,
      );
    }
  }

  /**
   * Delete recording by ID
   */
  async deleteRecording(recordingId: string): Promise<boolean> {
    const [type, id] = recordingId.split('_', 2);

    if (type === 'freepbx') {
      // FreePBX recordings - read-only, cannot delete
      this.logger.warn('FreePBX recordings are read-only. Cannot delete.');
      throw new BadRequestException('FreePBX recordings cannot be deleted through this service');
    } else if (type === 'custom') {
      // Delete all format variants
      const baseName = id.replace(/\.[^.]+$/, '');
      const formats = ['wav', 'ul', 'al', 'gsm', 'sln16', 'mp3'];

      for (const format of formats) {
        const filePath = path.join(this.customSoundsDir, `${baseName}.${format}`);
        try {
          await fs.unlink(filePath);
          this.logger.log(`Deleted: ${filePath}`);
        } catch (err: any) {
          // File might not exist in this format - ignore
          if (err.code !== 'ENOENT') {
            this.logger.warn(`Failed to delete ${filePath}: ${err.message}`);
          }
        }
      }
      return true;
    } else if (type === 'monitor') {
      // Delete monitor recording
      const recordings = await this.getMonitorRecordings();
      const recording = recordings.find((r) => r.name === id);
      if (recording) {
        try {
          await fs.unlink(recording.path);
          this.logger.log(`Deleted monitor recording: ${recording.path}`);
          return true;
        } catch (error: any) {
          this.logger.error(`Failed to delete monitor recording: ${error.message}`);
          throw new BadRequestException(`Failed to delete recording: ${error.message}`);
        }
      } else {
        throw new NotFoundException(`Monitor recording not found: ${id}`);
      }
    }

    throw new BadRequestException(`Invalid recording ID format: ${recordingId}`);
  }

  /**
   * Get monitor recordings (call recordings)
   */
  async getMonitorRecordings(limit: number = 100): Promise<AudioFileInfo[]> {
    const recordings: AudioFileInfo[] = [];

    const walkDir = async (dir: string, depth: number = 0): Promise<void> => {
      if (depth > 5) return; // Prevent deep recursion

      try {
        const files = await fs.readdir(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          try {
            const stats = await fs.stat(filePath);

            if (stats.isDirectory() && depth < 3) {
              await walkDir(filePath, depth + 1);
            } else if (stats.isFile() && this.isAudioFile(file)) {
              recordings.push({
                name: file,
                path: filePath,
                size: stats.size,
                format: path.extname(file).substring(1),
                createdAt: stats.birthtime || stats.mtime,
              });

              if (recordings.length >= limit) break;
            }
          } catch (error: any) {
            // Skip files we can't access
            this.logger.debug(`Skipping ${filePath}: ${error.message}`);
          }
        }
      } catch (error: any) {
        this.logger.warn(`Cannot read directory ${dir}: ${error.message}`);
      }
    };

    try {
      await walkDir(this.monitorDir);
      recordings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return recordings.slice(0, limit);
    } catch (error: any) {
      this.logger.error(`Failed to get monitor recordings: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Get audio file path for streaming
   */
  async getAudioFilePath(recordingId: string): Promise<string> {
    const [type, id] = recordingId.split('_', 2);
    let filePath: string | null = null;

    if (type === 'freepbx') {
      // FreePBX recordings - would need database access
      // This is intentionally not implemented to avoid modifying FreePBX
      throw new BadRequestException('FreePBX recordings access not implemented. Use custom recordings instead.');
    } else if (type === 'custom') {
      // Try various formats
      const formats = ['wav', 'mp3', 'ul', 'al', 'gsm'];
      for (const format of formats) {
        const testPath = path.join(
          this.customSoundsDir,
          id.includes('.') ? id : `${id}.${format}`,
        );
        try {
          await fs.access(testPath);
          filePath = testPath;
          break;
        } catch (err) {
          // Try next format
        }
      }
    } else if (type === 'monitor') {
      const recordings = await this.getMonitorRecordings();
      const recording = recordings.find((r) => r.name === id);
      if (recording) {
        filePath = recording.path;
      }
    }

    if (!filePath) {
      throw new NotFoundException(`Audio file not found: ${recordingId}`);
    }

    return filePath;
  }

  /**
   * Get MIME type for audio file
   */
  getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.ul': 'audio/basic',
      '.al': 'audio/basic',
      '.gsm': 'audio/x-gsm',
      '.sln16': 'audio/x-sln16',
      '.ogg': 'audio/ogg',
      '.webm': 'audio/webm',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Check if file is an audio file
   */
  private isAudioFile(filename: string): boolean {
    const audioExtensions = ['.wav', '.mp3', '.ul', '.al', '.gsm', '.sln16', '.ogg', '.webm', '.m4a'];
    const ext = path.extname(filename).toLowerCase();
    return audioExtensions.includes(ext);
  }

  /**
   * Reload Asterisk configuration (read-only command)
   */
  async reloadAsterisk(): Promise<boolean> {
    try {
      await execAsync('asterisk -rx "core reload"');
      this.logger.log('Asterisk reloaded successfully');
      return true;
    } catch (error: any) {
      // Try alternative reload command
      try {
        await execAsync('asterisk -rx "reload"');
        this.logger.log('Asterisk reloaded successfully (alternative command)');
        return true;
      } catch (err: any) {
        this.logger.error(`Failed to reload Asterisk: ${err.message}`, err.stack);
        return false;
      }
    }
  }

  /**
   * List custom sound files
   */
  async listCustomSounds(): Promise<AudioFileInfo[]> {
    const sounds: AudioFileInfo[] = [];

    try {
      const files = await fs.readdir(this.customSoundsDir);

      for (const file of files) {
        const filePath = path.join(this.customSoundsDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile() && this.isAudioFile(file)) {
            sounds.push({
              name: file,
              path: filePath,
              size: stats.size,
              format: path.extname(file).substring(1),
              createdAt: stats.birthtime || stats.mtime,
            });
          }
        } catch (error: any) {
          this.logger.debug(`Skipping ${filePath}: ${error.message}`);
        }
      }

      return sounds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error: any) {
      this.logger.error(`Failed to list custom sounds: ${error.message}`, error.stack);
      return [];
    }
  }
}

