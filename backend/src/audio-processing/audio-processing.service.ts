import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface AudioEffectsConfig {
  distance?: 'close' | 'medium' | 'far';
  backgroundNoise?: {
    enabled: boolean;
    volume?: number;
    file?: string;
  };
  volume?: number;
  coughEffects?: Array<{
    file: 'stifled-cough' | 'coughing-woman' | 'coughing-woman-2';
    timestamp: number;
    volume?: number;
  }>;
}

@Injectable()
export class AudioProcessingService {
  private readonly logger = new Logger(AudioProcessingService.name);
  private readonly soundEffectsDir: string;
  private readonly tempDir: string;

  constructor() {
    this.soundEffectsDir = path.join(process.cwd(), 'uploads', 'sound-effects');
    this.tempDir = path.join(process.cwd(), 'uploads', 'temp');
    
    // Ensure directories exist
    [this.soundEffectsDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Process audio with effects: distance, background noise, volume, and cough effects
   */
  async processAudio(
    inputAudioBuffer: Buffer,
    inputSampleRate: number = 24000,
    effects: AudioEffectsConfig,
  ): Promise<Buffer> {
    const tempId = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(this.tempDir, `input_${tempId}.wav`);
    const outputPath = path.join(this.tempDir, `output_${tempId}.wav`);

    try {
      // Save input audio to temp file
      await fs.promises.writeFile(inputPath, inputAudioBuffer);

      let currentPath = inputPath;
      let processedPath = inputPath;

      // Step 1: Apply distance effect (reverb/echo)
      if (effects.distance) {
        processedPath = await this.applyDistanceEffect(currentPath, effects.distance, tempId);
        if (currentPath !== inputPath) {
          await fs.promises.unlink(currentPath).catch(() => {});
        }
        currentPath = processedPath;
      }

      // Step 2: Mix background noise
      if (effects.backgroundNoise?.enabled) {
        processedPath = await this.mixBackgroundNoise(
          currentPath,
          effects.backgroundNoise.volume ?? 0.3,
          effects.backgroundNoise.file,
          tempId,
        );
        if (currentPath !== inputPath) {
          await fs.promises.unlink(currentPath).catch(() => {});
        }
        currentPath = processedPath;
      }

      // Step 3: Insert cough effects
      if (effects.coughEffects && effects.coughEffects.length > 0) {
        processedPath = await this.insertCoughEffects(
          currentPath,
          effects.coughEffects,
          tempId,
        );
        if (currentPath !== inputPath) {
          await fs.promises.unlink(currentPath).catch(() => {});
        }
        currentPath = processedPath;
      }

      // Step 4: Adjust volume
      if (effects.volume !== undefined && effects.volume !== 1.0) {
        processedPath = await this.adjustVolume(currentPath, effects.volume, tempId);
        if (currentPath !== inputPath) {
          await fs.promises.unlink(currentPath).catch(() => {});
        }
        currentPath = processedPath;
      }

      // Read processed audio from current path (which is the final processed result)
      const processedBuffer = await fs.promises.readFile(currentPath);

      // Cleanup temp files
      await this.cleanupTempFiles(tempId);

      return processedBuffer;
    } catch (error: any) {
      this.logger.error('Failed to process audio', error);
      // Cleanup on error
      await this.cleanupTempFiles(tempId).catch(() => {});
      throw error;
    }
  }

  /**
   * Apply distance effect using reverb/echo
   */
  private async applyDistanceEffect(
    inputPath: string,
    distance: 'close' | 'medium' | 'far',
    tempId: string,
  ): Promise<string> {
    const outputPath = path.join(this.tempDir, `distance_${tempId}.wav`);

    // Reverb parameters based on distance
    const reverbParams = {
      close: '0 0 0 0 0 0', // Minimal reverb
      medium: '50 50 100 100 0 0', // Moderate reverb
      far: '90 90 100 100 0 0', // Strong reverb (distant sound)
    };

    const reverb = reverbParams[distance];

    try {
      // Use sox reverb effect
      await execAsync(
        `sox "${inputPath}" "${outputPath}" reverb ${reverb}`,
        { timeout: 30000 },
      );
      return outputPath;
    } catch (error: any) {
      this.logger.warn(`Failed to apply distance effect, using original: ${error.message}`);
      return inputPath; // Return original if processing fails
    }
  }

  /**
   * Mix background noise with main audio
   */
  private async mixBackgroundNoise(
    inputPath: string,
    noiseVolume: number,
    noiseFile?: string,
    tempId?: string,
  ): Promise<string> {
    const outputPath = path.join(this.tempDir, `mixed_${tempId || Date.now()}.wav`);
    
    // Determine background noise file
    const noiseFileName = noiseFile || 'office-quiet-work-ambience-gfx-sounds-1-1-01-32.mp3';
    const noisePath = path.join(this.soundEffectsDir, noiseFileName);

    if (!fs.existsSync(noisePath)) {
      this.logger.warn(`Background noise file not found: ${noisePath}`);
      return inputPath; // Return original if noise file doesn't exist
    }

    try {
      // Get duration of input audio
      const { stdout: durationOutput } = await execAsync(
        `soxi -D "${inputPath}"`,
        { timeout: 5000 },
      );
      const duration = parseFloat(durationOutput.trim());

      // Mix: use sox to combine input audio with background noise
      // -m = mix mode, -v = volume adjustment
      await execAsync(
        `sox -m -v 1.0 "${inputPath}" -v ${noiseVolume} "${noisePath}" "${outputPath}" trim 0 ${duration}`,
        { timeout: 60000 },
      );

      return outputPath;
    } catch (error: any) {
      this.logger.warn(`Failed to mix background noise, using original: ${error.message}`);
      return inputPath; // Return original if mixing fails
    }
  }

  /**
   * Insert cough sound effects at specified timestamps
   */
  private async insertCoughEffects(
    inputPath: string,
    coughEffects: Array<{ file: string; timestamp: number; volume?: number }>,
    tempId: string,
  ): Promise<string> {
    // Sort cough effects by timestamp
    const sortedCoughs = [...coughEffects].sort((a, b) => a.timestamp - b.timestamp);

    let currentPath = inputPath;
    let segmentIndex = 0;

    try {
      // Get total duration
      const { stdout: durationOutput } = await execAsync(
        `soxi -D "${currentPath}"`,
        { timeout: 5000 },
      );
      const totalDuration = parseFloat(durationOutput.trim());

      // Process each cough effect
      for (const cough of sortedCoughs) {
        if (cough.timestamp < 0 || cough.timestamp > totalDuration) {
          this.logger.warn(`Cough timestamp ${cough.timestamp} out of range, skipping`);
          continue;
        }

        const coughFileName = this.getCoughFileName(cough.file);
        const coughPath = path.join(this.soundEffectsDir, coughFileName);

        if (!fs.existsSync(coughPath)) {
          this.logger.warn(`Cough file not found: ${coughPath}`);
          continue;
        }

        const nextPath = path.join(this.tempDir, `cough_${tempId}_${segmentIndex}.wav`);

        // Split audio: before cough, cough, after cough
        const beforeDuration = cough.timestamp;
        const afterStart = cough.timestamp;

        // Extract before segment
        const beforePath = path.join(this.tempDir, `before_${tempId}_${segmentIndex}.wav`);
        await execAsync(
          `sox "${currentPath}" "${beforePath}" trim 0 ${beforeDuration}`,
          { timeout: 30000 },
        );

        // Extract after segment
        const afterPath = path.join(this.tempDir, `after_${tempId}_${segmentIndex}.wav`);
        await execAsync(
          `sox "${currentPath}" "${afterPath}" trim ${afterStart}`,
          { timeout: 30000 },
        );

        // Get cough duration
        const { stdout: coughDurationOutput } = await execAsync(
          `soxi -D "${coughPath}"`,
          { timeout: 5000 },
        );
        const coughDuration = parseFloat(coughDurationOutput.trim());

        // Adjust cough volume
        const coughVolume = cough.volume ?? 0.5;
        const adjustedCoughPath = path.join(this.tempDir, `cough_adj_${tempId}_${segmentIndex}.wav`);
        await execAsync(
          `sox -v ${coughVolume} "${coughPath}" "${adjustedCoughPath}"`,
          { timeout: 30000 },
        );

        // Concatenate: before + cough + after
        await execAsync(
          `sox "${beforePath}" "${adjustedCoughPath}" "${afterPath}" "${nextPath}"`,
          { timeout: 60000 },
        );

        // Cleanup intermediate files
        await Promise.all([
          fs.promises.unlink(beforePath).catch(() => {}),
          fs.promises.unlink(afterPath).catch(() => {}),
          fs.promises.unlink(adjustedCoughPath).catch(() => {}),
        ]);

        // Update current path and adjust timestamps for remaining coughs
        if (currentPath !== inputPath && segmentIndex > 0) {
          await fs.promises.unlink(currentPath).catch(() => {});
        }
        currentPath = nextPath;
        segmentIndex++;

        // Adjust remaining cough timestamps by adding cough duration
        const remainingCoughs = sortedCoughs.slice(sortedCoughs.indexOf(cough) + 1);
        remainingCoughs.forEach(c => {
          c.timestamp += coughDuration;
        });
      }

      return currentPath;
    } catch (error: any) {
      this.logger.warn(`Failed to insert cough effects, using original: ${error.message}`);
      return inputPath; // Return original if processing fails
    }
  }

  /**
   * Adjust overall volume
   */
  private async adjustVolume(
    inputPath: string,
    volume: number,
    tempId: string,
  ): Promise<string> {
    const outputPath = path.join(this.tempDir, `volume_${tempId}.wav`);

    try {
      // sox -v adjusts volume (1.0 = no change, 0.5 = half volume, 2.0 = double volume)
      await execAsync(
        `sox -v ${volume} "${inputPath}" "${outputPath}"`,
        { timeout: 30000 },
      );
      return outputPath;
    } catch (error: any) {
      this.logger.warn(`Failed to adjust volume, using original: ${error.message}`);
      return inputPath; // Return original if processing fails
    }
  }

  /**
   * Get cough file name from effect type
   */
  private getCoughFileName(coughType: string): string {
    const coughFiles = {
      'stifled-cough': 'stifled-cough-om-fx-1-00-01.mp3',
      'coughing-woman': 'coughing-woman-gamemaster-audio-5-5-00-00.mp3',
      'coughing-woman-2': 'coughing-woman-gamemaster-audio-5-5-00-00.mp3', // Same file for now
    };
    return coughFiles[coughType as keyof typeof coughFiles] || coughFiles['stifled-cough'];
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(tempId: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.tempDir);
      const tempFiles = files.filter(f => f.includes(tempId));
      await Promise.all(
        tempFiles.map(f => 
          fs.promises.unlink(path.join(this.tempDir, f)).catch(() => {})
        ),
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

