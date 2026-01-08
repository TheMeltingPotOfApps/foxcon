import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TenantLeadStatus } from './entities/tenant-lead-status.entity';
import { StatusAutomation, AutomationTriggerType } from './entities/status-automation.entity';
import { CreateTenantLeadStatusDto, UpdateTenantLeadStatusDto } from './dto/create-status.dto';
import { CreateStatusAutomationDto, UpdateStatusAutomationDto } from './dto/create-automation.dto';
import { Contact } from '../entities/contact.entity';

@Injectable()
export class LeadStatusesService {
  private readonly logger = new Logger(LeadStatusesService.name);

  constructor(
    @InjectRepository(TenantLeadStatus)
    private statusRepository: Repository<TenantLeadStatus>,
    @InjectRepository(StatusAutomation)
    private automationRepository: Repository<StatusAutomation>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  // ========== Status Management ==========

  async createStatus(tenantId: string, dto: CreateTenantLeadStatusDto): Promise<TenantLeadStatus> {
    // Check if status with same name already exists
    const existing = await this.statusRepository.findOne({
      where: { tenantId, name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(`Status with name "${dto.name}" already exists`);
    }

    // Get max display order if not provided
    if (dto.displayOrder === undefined) {
      const maxOrder = await this.statusRepository
        .createQueryBuilder('status')
        .where('status.tenantId = :tenantId', { tenantId })
        .select('MAX(status.displayOrder)', 'max')
        .getRawOne();
      dto.displayOrder = (maxOrder?.max ?? -1) + 1;
    }

    const status = this.statusRepository.create({
      tenantId,
      ...dto,
      isActive: dto.isActive ?? true,
    });

    return this.statusRepository.save(status);
  }

  async findAllStatuses(tenantId: string, includeInactive = false): Promise<TenantLeadStatus[]> {
    // Ensure default statuses are initialized if none exist
    const existingCount = await this.statusRepository.count({ where: { tenantId } });
    if (existingCount === 0) {
      await this.initializeDefaultStatuses(tenantId);
    }

    const query = this.statusRepository
      .createQueryBuilder('status')
      .where('status.tenantId = :tenantId', { tenantId })
      .orderBy('status.displayOrder', 'ASC')
      .addOrderBy('status.name', 'ASC');

    if (!includeInactive) {
      query.andWhere('status.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  async findOneStatus(tenantId: string, id: string): Promise<TenantLeadStatus> {
    const status = await this.statusRepository.findOne({
      where: { id, tenantId },
    });

    if (!status) {
      throw new NotFoundException(`Status with ID ${id} not found`);
    }

    return status;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateTenantLeadStatusDto,
  ): Promise<TenantLeadStatus> {
    const status = await this.findOneStatus(tenantId, id);

    // Check name uniqueness if name is being updated
    if (dto.name && dto.name !== status.name) {
      const existing = await this.statusRepository.findOne({
        where: { tenantId, name: dto.name },
      });

      if (existing) {
        throw new BadRequestException(`Status with name "${dto.name}" already exists`);
      }
    }

    Object.assign(status, dto);
    return this.statusRepository.save(status);
  }

  async deleteStatus(tenantId: string, id: string): Promise<void> {
    const status = await this.findOneStatus(tenantId, id);

    if (status.isSystem) {
      throw new BadRequestException('Cannot delete system status');
    }

    // Check if status is used by any contacts
    const contactCount = await this.contactRepository.count({
      where: { tenantId, leadStatus: status.name },
    });

    if (contactCount > 0) {
      throw new BadRequestException(
        `Cannot delete status. It is currently assigned to ${contactCount} contact(s). Please update those contacts first.`,
      );
    }

    // Check if status is used by any automations
    const automationCount = await this.automationRepository.count({
      where: [
        { tenantId, fromStatusId: id },
        { tenantId, triggerStatusId: id },
        { tenantId, targetStatusId: id },
      ],
    });

    if (automationCount > 0) {
      throw new BadRequestException(
        `Cannot delete status. It is referenced by ${automationCount} automation(s). Please update or delete those automations first.`,
      );
    }

    await this.statusRepository.remove(status);
  }

  async reorderStatuses(tenantId: string, statusIds: string[]): Promise<TenantLeadStatus[]> {
    const statuses = await this.statusRepository.find({
      where: { tenantId, id: In(statusIds) },
    });

    if (statuses.length !== statusIds.length) {
      throw new BadRequestException('Some status IDs not found');
    }

    // Update display order based on array position
    const updates = statuses.map((status, index) => {
      status.displayOrder = index;
      return this.statusRepository.save(status);
    });

    await Promise.all(updates);

    return this.findAllStatuses(tenantId);
  }

  // ========== Automation Management ==========

  async createAutomation(
    tenantId: string,
    dto: CreateStatusAutomationDto,
  ): Promise<StatusAutomation> {
    // Validate target status exists
    await this.findOneStatus(tenantId, dto.targetStatusId);

    // Validate fromStatusId if provided
    if (dto.fromStatusId) {
      await this.findOneStatus(tenantId, dto.fromStatusId);
    }

    // Validate triggerStatusId if provided
    if (dto.triggerStatusId) {
      await this.findOneStatus(tenantId, dto.triggerStatusId);
    }

    // Validate time-based trigger has required fields
    if (dto.triggerType === AutomationTriggerType.TIME_BASED) {
      if (!dto.timeValue || !dto.timeUnit) {
        throw new BadRequestException('timeValue and timeUnit are required for TIME_BASED triggers');
      }
    }

    // Validate status-change trigger has triggerStatusId
    if (dto.triggerType === AutomationTriggerType.STATUS_CHANGE) {
      if (!dto.triggerStatusId) {
        throw new BadRequestException('triggerStatusId is required for STATUS_CHANGE triggers');
      }
    }

    const automation = this.automationRepository.create({
      tenantId,
      ...dto,
      isActive: dto.isActive ?? true,
    });

    return this.automationRepository.save(automation);
  }

  async findAllAutomations(tenantId: string, includeInactive = false): Promise<StatusAutomation[]> {
    const query = this.automationRepository
      .createQueryBuilder('automation')
      .leftJoinAndSelect('automation.fromStatus', 'fromStatus')
      .leftJoinAndSelect('automation.triggerStatus', 'triggerStatus')
      .leftJoinAndSelect('automation.targetStatus', 'targetStatus')
      .where('automation.tenantId = :tenantId', { tenantId })
      .orderBy('automation.createdAt', 'DESC');

    if (!includeInactive) {
      query.andWhere('automation.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  async findOneAutomation(tenantId: string, id: string): Promise<StatusAutomation> {
    const automation = await this.automationRepository.findOne({
      where: { id, tenantId },
      relations: ['fromStatus', 'triggerStatus', 'targetStatus'],
    });

    if (!automation) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    return automation;
  }

  async updateAutomation(
    tenantId: string,
    id: string,
    dto: UpdateStatusAutomationDto,
  ): Promise<StatusAutomation> {
    const automation = await this.findOneAutomation(tenantId, id);

    // Validate status IDs if provided
    if (dto.targetStatusId) {
      await this.findOneStatus(tenantId, dto.targetStatusId);
    }

    if (dto.fromStatusId) {
      await this.findOneStatus(tenantId, dto.fromStatusId);
    }

    if (dto.triggerStatusId) {
      await this.findOneStatus(tenantId, dto.triggerStatusId);
    }

    Object.assign(automation, dto);
    return this.automationRepository.save(automation);
  }

  async deleteAutomation(tenantId: string, id: string): Promise<void> {
    const automation = await this.findOneAutomation(tenantId, id);
    await this.automationRepository.remove(automation);
  }

  // ========== Automation Processing ==========

  async processAutomations(tenantId: string): Promise<number> {
    const automations = await this.automationRepository.find({
      where: { tenantId, isActive: true },
      relations: ['fromStatus', 'triggerStatus', 'targetStatus'],
    });

    let processedCount = 0;

    for (const automation of automations) {
      try {
        const count = await this.processAutomation(automation);
        processedCount += count;

        // Update metadata
        automation.metadata = {
          ...automation.metadata,
          lastProcessedAt: new Date(),
          processedCount: (automation.metadata?.processedCount || 0) + count,
        };
        await this.automationRepository.save(automation);
      } catch (error) {
        this.logger.error(
          `Failed to process automation ${automation.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    return processedCount;
  }

  private async processAutomation(automation: StatusAutomation): Promise<number> {
    if (automation.triggerType === AutomationTriggerType.TIME_BASED) {
      return this.processTimeBasedAutomation(automation);
    } else if (automation.triggerType === AutomationTriggerType.STATUS_CHANGE) {
      // Status change automations are processed immediately when status changes
      // This method is for time-based only
      return 0;
    }

    return 0;
  }

  private async processTimeBasedAutomation(automation: StatusAutomation): Promise<number> {
    if (!automation.timeValue || !automation.timeUnit || !automation.targetStatusId) {
      return 0;
    }

    // Calculate the cutoff date
    const now = new Date();
    let cutoffDate = new Date();

    switch (automation.timeUnit) {
      case 'MINUTES':
        cutoffDate.setMinutes(cutoffDate.getMinutes() - automation.timeValue);
        break;
      case 'HOURS':
        cutoffDate.setHours(cutoffDate.getHours() - automation.timeValue);
        break;
      case 'DAYS':
        cutoffDate.setDate(cutoffDate.getDate() - automation.timeValue);
        break;
    }

    // Build query for contacts that match the criteria
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.tenantId = :tenantId', { tenantId: automation.tenantId })
      .andWhere('contact.leadStatus = :fromStatus', {
        fromStatus: automation.fromStatus?.name || null,
      })
      .andWhere('contact.updatedAt <= :cutoffDate', { cutoffDate });

    // Apply conditions if specified
    if (automation.conditions?.campaignIds?.length) {
      // This would require joining with campaign_contacts table
      // For now, we'll skip this condition
    }

    const contacts = await queryBuilder.getMany();

    if (contacts.length === 0) {
      return 0;
    }

    // Get target status name
    const targetStatus = await this.statusRepository.findOne({
      where: { id: automation.targetStatusId },
    });

    if (!targetStatus) {
      this.logger.warn(`Target status ${automation.targetStatusId} not found for automation ${automation.id}`);
      return 0;
    }

    // Update contacts
    const contactIds = contacts.map((c) => c.id);
    await this.contactRepository.update(
      { id: In(contactIds) },
      { leadStatus: targetStatus.name },
    );

    this.logger.log(
      `Processed automation ${automation.id}: Updated ${contacts.length} contact(s) from "${automation.fromStatus?.name || 'any'}" to "${targetStatus.name}"`,
    );

    return contacts.length;
  }

  // ========== Helper Methods ==========

  async getDefaultStatus(tenantId: string): Promise<TenantLeadStatus | null> {
    // Get the first active status by display order
    return this.statusRepository.findOne({
      where: { tenantId, isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async initializeDefaultStatuses(tenantId: string): Promise<void> {
    // Check if tenant already has statuses
    const existingCount = await this.statusRepository.count({ where: { tenantId } });
    if (existingCount > 0) {
      return; // Already initialized
    }

    // Create default statuses
    const defaultStatuses = [
      { name: 'New Lead', color: '#3B82F6', displayOrder: 0, isSystem: true },
      { name: 'Contacted', color: '#10B981', displayOrder: 1, isSystem: true },
      { name: 'Qualified', color: '#F59E0B', displayOrder: 2, isSystem: true },
      { name: 'Appointment Scheduled', color: '#8B5CF6', displayOrder: 3, isSystem: true },
      { name: 'Closed Won', color: '#059669', displayOrder: 4, isSystem: true },
      { name: 'Closed Lost', color: '#EF4444', displayOrder: 5, isSystem: true },
      { name: 'Do Not Contact', color: '#6B7280', displayOrder: 6, isSystem: true },
    ];

    for (const statusData of defaultStatuses) {
      await this.statusRepository.save(
        this.statusRepository.create({
          tenantId,
          ...statusData,
          isActive: true,
        }),
      );
    }

    this.logger.log(`Initialized default statuses for tenant ${tenantId}`);
  }
}

