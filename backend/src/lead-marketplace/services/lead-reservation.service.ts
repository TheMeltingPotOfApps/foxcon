import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadReservation } from '../entities/lead-reservation.entity';
import { LeadReservationTransaction, TransactionType } from '../entities/lead-reservation-transaction.entity';
import { LeadReservationExchangeRate } from '../entities/lead-reservation-exchange-rate.entity';

@Injectable()
export class LeadReservationService {
  private readonly logger = new Logger(LeadReservationService.name);

  constructor(
    @InjectRepository(LeadReservation)
    private leadReservationRepository: Repository<LeadReservation>,
    @InjectRepository(LeadReservationTransaction)
    private transactionRepository: Repository<LeadReservationTransaction>,
    @InjectRepository(LeadReservationExchangeRate)
    private exchangeRateRepository: Repository<LeadReservationExchangeRate>,
  ) {}

  async getBalance(tenantId: string, userId: string): Promise<number> {
    const reservation = await this.leadReservationRepository.findOne({
      where: { tenantId, userId },
    });

    return reservation ? Number(reservation.balance) : 0;
  }

  async getOrCreateReservation(tenantId: string, userId: string): Promise<LeadReservation> {
    let reservation = await this.leadReservationRepository.findOne({
      where: { tenantId, userId },
    });

    if (!reservation) {
      reservation = this.leadReservationRepository.create({
        tenantId,
        userId,
        balance: 0,
      });
      reservation = await this.leadReservationRepository.save(reservation);
    }

    return reservation;
  }

  async purchase(
    tenantId: string,
    userId: string,
    usdAmount: number,
    metadata?: Record<string, any>,
  ): Promise<LeadReservation> {
    // Get current exchange rate
    const exchangeRate = await this.getActiveExchangeRate();
    if (!exchangeRate) {
      throw new BadRequestException('No active exchange rate set. Please contact support.');
    }

    const leadReservations = usdAmount * Number(exchangeRate.rate);

    const reservation = await this.getOrCreateReservation(tenantId, userId);

    // Update balance
    reservation.balance = Number(reservation.balance) + leadReservations;
    await this.leadReservationRepository.save(reservation);

    // Create transaction record
    await this.transactionRepository.save({
      tenantId,
      userId,
      type: TransactionType.PURCHASE,
      amount: leadReservations,
      metadata: {
        usdAmount,
        exchangeRate: Number(exchangeRate.rate),
        ...metadata,
      },
    });

    this.logger.log(`User ${userId} purchased ${leadReservations} Lead Reservations for $${usdAmount}`);

    return reservation;
  }

  async spend(
    tenantId: string,
    userId: string,
    amount: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const reservation = await this.getOrCreateReservation(tenantId, userId);

    if (Number(reservation.balance) < amount) {
      throw new BadRequestException('Insufficient Lead Reservations balance');
    }

    reservation.balance = Number(reservation.balance) - amount;
    await this.leadReservationRepository.save(reservation);

    // Create transaction record
    await this.transactionRepository.save({
      tenantId,
      userId,
      type: TransactionType.SPEND,
      amount: -amount,
      metadata,
    });
  }

  async refund(
    tenantId: string,
    userId: string,
    amount: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const reservation = await this.getOrCreateReservation(tenantId, userId);

    reservation.balance = Number(reservation.balance) + amount;
    await this.leadReservationRepository.save(reservation);

    // Create transaction record
    await this.transactionRepository.save({
      tenantId,
      userId,
      type: TransactionType.REFUND,
      amount,
      metadata,
    });
  }

  async getTransactions(
    tenantId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ transactions: LeadReservationTransaction[]; total: number }> {
    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { tenantId, userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { transactions, total };
  }

  async getActiveExchangeRate(): Promise<LeadReservationExchangeRate | null> {
    return this.exchangeRateRepository.findOne({
      where: { effectiveTo: null },
      order: { effectiveFrom: 'DESC' },
    });
  }

  async setExchangeRate(
    rate: number,
    createdBy: string,
    effectiveFrom?: Date,
  ): Promise<LeadReservationExchangeRate> {
    // End previous rate if exists
    const previousRate = await this.getActiveExchangeRate();
    if (previousRate) {
      previousRate.effectiveTo = effectiveFrom || new Date();
      await this.exchangeRateRepository.save(previousRate);
    }

    // Create new rate
    const newRate = this.exchangeRateRepository.create({
      rate,
      createdBy,
      effectiveFrom: effectiveFrom || new Date(),
    });

    return this.exchangeRateRepository.save(newRate);
  }
}

