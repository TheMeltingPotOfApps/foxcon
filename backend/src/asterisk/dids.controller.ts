import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DidsService } from './dids.service';
import { AsteriskDid, DidStatus } from '../entities/asterisk-did.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('asterisk-dids')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DidsController {
  constructor(private readonly didsService: DidsService) {}

  @Post()
  async create(@TenantId() tenantId: string, @Body() data: Partial<AsteriskDid>) {
    return this.didsService.create(tenantId, data);
  }

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: DidStatus,
    @Query('segment') segment?: string,
  ) {
    return this.didsService.findAll(tenantId, status, segment);
  }

  @Get('segments')
  async getSegments(@TenantId() tenantId: string) {
    const segments = await this.didsService.getSegments(tenantId);
    return { segments };
  }

  @Get('pools')
  async getDidPools(@TenantId() tenantId: string) {
    const pools = await this.didsService.getDidPools(tenantId);
    return pools;
  }

  @Get('next-available-by-segment')
  async getNextAvailableBySegment(
    @TenantId() tenantId: string,
    @Query('segment') segment?: string,
  ) {
    const did = await this.didsService.getNextAvailableDidBySegment(tenantId, segment);
    if (!did) {
      return { available: false, message: `No available DIDs found${segment ? ` in segment: ${segment}` : ''}` };
    }
    return { available: true, did };
  }

  @Get('next-available')
  async getNextAvailable(@TenantId() tenantId: string) {
    const did = await this.didsService.getNextAvailableDid(tenantId);
    if (!did) {
      return { available: false, message: 'No available DIDs found' };
    }
    return { available: true, did };
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.didsService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() data: Partial<AsteriskDid>,
  ) {
    return this.didsService.update(tenantId, id, data);
  }

  @Delete(':id')
  async delete(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.didsService.delete(tenantId, id);
    return { success: true };
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV files are allowed'), false);
        }
      },
    }),
  )
  async importCSV(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const csvContent = file.buffer.toString('utf-8');
    const result = await this.didsService.importFromCSV(tenantId, csvContent, file.originalname);

    return {
      success: true,
      ...result,
    };
  }
}

