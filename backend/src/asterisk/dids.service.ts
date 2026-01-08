import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AsteriskDid, DidStatus } from '../entities/asterisk-did.entity';
import { PhoneFormatter } from '../utils/phone-formatter';
import { Tenant } from '../entities/tenant.entity';

export interface DidImportRow {
  number: string;
  areaCode?: string;
  trunk?: string;
  status?: string;
  maxUsage?: string;
  provider?: string;
  region?: string;
  notes?: string;
}

export interface DidImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{ row: number; number: string; error: string }>;
}

@Injectable()
export class DidsService {
  private readonly logger = new Logger(DidsService.name);

  constructor(
    @InjectRepository(AsteriskDid)
    private didRepository: Repository<AsteriskDid>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async create(tenantId: string, data: Partial<AsteriskDid>): Promise<AsteriskDid> {
    // Format phone number to E.164
    let formattedNumber: string;
    try {
      formattedNumber = PhoneFormatter.formatToE164(data.number || '');
    } catch (error: any) {
      throw new BadRequestException(`Invalid phone number: ${data.number} - ${error.message}`);
    }

    // Extract area code
    const areaCode = this.extractAreaCode(formattedNumber);

    // Check for duplicates
    const existing = await this.didRepository.findOne({
      where: { tenantId, number: formattedNumber },
    });

    if (existing) {
      throw new BadRequestException(`DID already exists: ${formattedNumber}`);
    }

    const did = this.didRepository.create({
      tenantId,
      number: formattedNumber,
      areaCode,
      trunk: data.trunk || 'MC',
      status: data.status || DidStatus.AVAILABLE,
      maxUsage: data.maxUsage || null,
      metadata: data.metadata || {},
    });

    return this.didRepository.save(did);
  }

  async findAll(tenantId: string, status?: DidStatus, segment?: string): Promise<AsteriskDid[]> {
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }
    if (segment) {
      where.segment = segment;
    }

    return this.didRepository.find({
      where,
      order: { usageCount: 'ASC', createdAt: 'ASC' },
    });
  }

  async getSegments(tenantId: string): Promise<string[]> {
    const results = await this.didRepository
      .createQueryBuilder('did')
      .select('DISTINCT did.segment', 'segment')
      .where('did.tenantId = :tenantId', { tenantId })
      .andWhere('did.segment IS NOT NULL')
      .getRawMany();

    return results.map((r) => r.segment).filter(Boolean);
  }

  /**
   * Get DID pools grouped by type (MC vs Twilio)
   * MC pool: DIDs with segment NOT starting with "twilio" or NULL segment
   * Twilio pool: DIDs with segment starting with "twilio" or "twilio-"
   */
  async getDidPools(tenantId: string): Promise<{
    mc: { count: number; segments: string[]; dids: AsteriskDid[] };
    twilio: { count: number; segments: string[]; dids: AsteriskDid[] };
  }> {
    const allDids = await this.didRepository.find({
      where: { tenantId },
      order: { usageCount: 'ASC', createdAt: 'ASC' },
    });

    const mcDids: AsteriskDid[] = [];
    const twilioDids: AsteriskDid[] = [];
    const mcSegments = new Set<string>();
    const twilioSegments = new Set<string>();

    for (const did of allDids) {
      const segment = did.segment || '';
      const isTwilio = segment && (segment.toLowerCase() === 'twilio' || segment.toLowerCase().startsWith('twilio-'));

      if (isTwilio) {
        twilioDids.push(did);
        if (segment) {
          twilioSegments.add(segment);
        }
      } else {
        mcDids.push(did);
        if (segment) {
          mcSegments.add(segment);
        } else {
          mcSegments.add('default'); // Default segment for MC DIDs without explicit segment
        }
      }
    }

    return {
      mc: {
        count: mcDids.length,
        segments: Array.from(mcSegments),
        dids: mcDids,
      },
      twilio: {
        count: twilioDids.length,
        segments: Array.from(twilioSegments),
        dids: twilioDids,
      },
    };
  }

  /**
   * Get next available DID by pool type (MC or Twilio)
   * MC pool: DIDs with segment NOT starting with "twilio" or NULL segment
   * Twilio pool: DIDs with segment starting with "twilio" or "twilio-"
   */
  async getNextAvailableDidByPoolType(tenantId: string, poolType: 'MC' | 'Twilio'): Promise<AsteriskDid | null> {
    const query = this.didRepository
      .createQueryBuilder('did')
      .where('did.tenantId = :tenantId', { tenantId })
      .andWhere('did.status = :status', { status: DidStatus.AVAILABLE });

    if (poolType === 'Twilio') {
      // Twilio pool: segment is "twilio" or starts with "twilio-"
      query.andWhere("(LOWER(did.segment) = 'twilio' OR LOWER(did.segment) LIKE 'twilio-%')");
    } else {
      // MC pool: segment is NULL or NOT starting with "twilio"
      query.andWhere(
        "(did.segment IS NULL OR (LOWER(did.segment) != 'twilio' AND LOWER(did.segment) NOT LIKE 'twilio-%'))"
      );
    }

    return query
      .orderBy('did.usageCount', 'ASC')
      .addOrderBy('did.createdAt', 'ASC')
      .limit(1)
      .getOne();
  }

  async getNextAvailableDidBySegment(tenantId: string, segment?: string): Promise<AsteriskDid | null> {
    const where: any = {
      tenantId,
      status: DidStatus.AVAILABLE,
    };
    if (segment) {
      where.segment = segment;
    }

    const available = await this.didRepository.find({
      where,
      order: { usageCount: 'ASC', createdAt: 'ASC' },
      take: 1,
    });

    return available.length > 0 ? available[0] : null;
  }

  async findOne(tenantId: string, id: string): Promise<AsteriskDid> {
    const did = await this.didRepository.findOne({
      where: { id, tenantId },
    });

    if (!did) {
      throw new NotFoundException(`DID not found: ${id}`);
    }

    return did;
  }

  async update(tenantId: string, id: string, data: Partial<AsteriskDid>): Promise<AsteriskDid> {
    const did = await this.findOne(tenantId, id);

    // If number is being updated, format it
    if (data.number && data.number !== did.number) {
      try {
        data.number = PhoneFormatter.formatToE164(data.number);
        data.areaCode = this.extractAreaCode(data.number);
      } catch (error: any) {
        throw new BadRequestException(`Invalid phone number: ${data.number}`);
      }
    }

    Object.assign(did, data);
    return this.didRepository.save(did);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const did = await this.findOne(tenantId, id);
    await this.didRepository.remove(did);
  }

  /**
   * Get next available DID for rotation
   * FORCED MC DIDs ONLY - Only returns DIDs from MC pool (not Twilio segments)
   */
  async getNextAvailableDid(tenantId: string): Promise<AsteriskDid | null> {
    // Query for MC DIDs only (exclude Twilio segments)
    // MC pool: segment is NULL or NOT starting with "twilio"
    const query = this.didRepository
      .createQueryBuilder('did')
      .where('did.tenantId = :tenantId', { tenantId })
      .andWhere('(did.status = :activeStatus OR did.status = :availableStatus)', {
        activeStatus: DidStatus.ACTIVE,
        availableStatus: DidStatus.AVAILABLE,
      })
      .andWhere(
        "(did.segment IS NULL OR (LOWER(did.segment) != 'twilio' AND LOWER(did.segment) NOT LIKE 'twilio-%'))"
      )
      .orderBy('did.usageCount', 'ASC')
      .addOrderBy('did.id', 'ASC');

    const dids = await query.getMany();

    // Filter DIDs that haven't exceeded max usage
    const availableDids = dids.filter((did) => {
      if (did.maxUsage === null) return true;
      return did.usageCount < did.maxUsage;
    });

    if (availableDids.length === 0) {
      return null;
    }

    return availableDids[0];
  }

  /**
   * Increment usage count for a DID
   */
  async incrementUsage(tenantId: string, didId: string): Promise<void> {
    await this.didRepository.increment({ id: didId, tenantId }, 'usageCount', 1);
    await this.didRepository.update(
      { id: didId, tenantId },
      { lastUsed: new Date() },
    );
  }

  /**
   * Import DIDs from CSV
   */
  async importFromCSV(
    tenantId: string,
    csvContent: string,
    filename?: string,
  ): Promise<DidImportResult> {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV file must contain at least a header and one data row');
    }

    // Parse header
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const numberIndex = headers.findIndex(
      (h) => h === 'number' || h === 'phone' || h === 'phonenumber' || h === 'did',
    );

    if (numberIndex === -1) {
      throw new BadRequestException('CSV must contain a "number" column');
    }

    const areaCodeIndex = headers.findIndex((h) => h === 'areacode' || h === 'area_code');
    const trunkIndex = headers.findIndex((h) => h === 'trunk');
    const statusIndex = headers.findIndex((h) => h === 'status');
    const maxUsageIndex = headers.findIndex((h) => h === 'maxusage' || h === 'max_usage');
    const providerIndex = headers.findIndex((h) => h === 'provider');
    const regionIndex = headers.findIndex((h) => h === 'region');
    const notesIndex = headers.findIndex((h) => h === 'notes' || h === 'note');

    const result: DidImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [],
    };

    // First pass: collect all numbers and check for duplicates in bulk
    const numbersToProcess: Array<{
      row: number;
      values: string[];
      formattedNumber: string;
      areaCode?: string;
      trunk: string;
      status: DidStatus;
      maxUsage: number | null;
      provider?: string;
      region?: string;
      notes?: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const number = values[numberIndex];

      if (!number) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          number: 'N/A',
          error: 'Phone number is required',
        });
        continue;
      }

      try {
        // Format phone number
        const formattedNumber = PhoneFormatter.formatToE164(number);

        // Extract other fields
        const areaCode = areaCodeIndex >= 0 ? values[areaCodeIndex] : undefined;
        const trunk = trunkIndex >= 0 ? values[trunkIndex] : 'PJSIP';
        const statusStr = statusIndex >= 0 ? values[statusIndex] : 'available';
        const maxUsageStr = maxUsageIndex >= 0 ? values[maxUsageIndex] : undefined;
        const provider = providerIndex >= 0 ? values[providerIndex] : undefined;
        const region = regionIndex >= 0 ? values[regionIndex] : undefined;
        const notes = notesIndex >= 0 ? values[notesIndex] : undefined;

        // Parse status
        let status = DidStatus.AVAILABLE;
        if (statusStr) {
          const statusLower = statusStr.toLowerCase();
          if (Object.values(DidStatus).includes(statusLower as DidStatus)) {
            status = statusLower as DidStatus;
          }
        }

        // Parse max usage
        let maxUsage: number | null = null;
        if (maxUsageStr) {
          const parsed = parseInt(maxUsageStr, 10);
          if (!isNaN(parsed) && parsed > 0) {
            maxUsage = parsed;
          }
        }

        numbersToProcess.push({
          row: i + 1,
          values,
          formattedNumber,
          areaCode,
          trunk: trunk || 'PJSIP',
          status,
          maxUsage,
          provider,
          region,
          notes,
        });
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          number,
          error: error.message || 'Unknown error',
        });
        this.logger.error(`Failed to process DID ${number}: ${error.message}`);
      }
    }

    // Bulk check for duplicates
    if (numbersToProcess.length > 0) {
      const formattedNumbers = numbersToProcess.map(n => n.formattedNumber);
      const existingDids = await this.didRepository.find({
        where: { tenantId, number: In(formattedNumbers) },
      });
      const existingNumbersSet = new Set(existingDids.map(d => d.number));

      // Filter out duplicates and prepare for bulk insert
      const didsToCreate = numbersToProcess
        .filter(n => {
          if (existingNumbersSet.has(n.formattedNumber)) {
            result.duplicates++;
            return false;
          }
          return true;
        })
        .map(n => this.didRepository.create({
          tenantId,
          number: n.formattedNumber,
          areaCode: n.areaCode || this.extractAreaCode(n.formattedNumber),
          trunk: n.trunk,
          status: n.status,
          maxUsage: n.maxUsage,
          metadata: {
            provider: n.provider,
            region: n.region,
            notes: n.notes,
            importedFrom: filename,
            importedAt: new Date(),
          },
        }));

      // Bulk insert DIDs
      if (didsToCreate.length > 0) {
        try {
          await this.didRepository.save(didsToCreate);
          result.success += didsToCreate.length;
        } catch (error: any) {
          // If bulk insert fails, fall back to individual saves for error tracking
          this.logger.warn(`Bulk insert failed, falling back to individual saves: ${error.message}`);
          for (const did of didsToCreate) {
            try {
              await this.didRepository.save(did);
              result.success++;
            } catch (err: any) {
              result.failed++;
              const originalRow = numbersToProcess.find(n => n.formattedNumber === did.number);
              result.errors.push({
                row: originalRow?.row || 0,
                number: did.number,
                error: err.message || 'Unknown error',
              });
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Extract area code from E.164 number
   */
  private extractAreaCode(number: string): string {
    // Remove + prefix
    const cleaned = number.replace(/^\+/, '');

    // For US/Canada numbers (+1XXXXXXXXXX), extract area code (positions 1-3)
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return cleaned.substring(1, 4);
    }

    // For 10-digit numbers (assume US/Canada without country code)
    if (cleaned.length === 10) {
      return cleaned.substring(0, 3);
    }

    // Return first 3 digits as fallback
    return cleaned.substring(0, 3);
  }
}

