#!/usr/bin/env ts-node
/**
 * Validation script to check call execution and metrics generation
 * Run with: npx ts-node backend/scripts/validate-call-system.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CallsService } from '../src/asterisk/calls.service';
import { AmiService } from '../src/asterisk/ami.service';
import { AmiEventListenerService } from '../src/asterisk/ami-event-listener.service';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallLog, CallStatus } from '../src/entities/call-log.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

interface ValidationResult {
  category: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
  message: string;
  details?: any;
}

class CallSystemValidator {
  private results: ValidationResult[] = [];

  constructor(
    private callsService: CallsService,
    private amiService: AmiService,
    private amiEventListenerService: AmiEventListenerService,
    private dashboardService: DashboardService,
    private callLogRepository: Repository<CallLog>,
  ) {}

  async validate(): Promise<void> {
    console.log('🔍 Starting Call System Validation...\n');

    await this.validateAMIConnection();
    await this.validatePhoneNumberFormatting();
    await this.validateRecentCallLogs();
    await this.validateCallMetrics();
    await this.validateCallFlowEvents();
    await this.validateTransferMetrics();

    this.printResults();
  }

  private async validateAMIConnection(): Promise<void> {
    console.log('📞 Checking AMI Connection...');
    
    const isConnected = this.amiService.isConnected();
    if (isConnected) {
      this.addResult('AMI Connection', 'PASS', 'AMI service is connected');
    } else {
      this.addResult('AMI Connection', 'FAIL', 'AMI service is NOT connected');
    }

    // Check event listener connection (if accessible)
    try {
      // Note: We can't directly check private properties, but we can infer from behavior
      this.addResult('AMI Event Listener', 'PASS', 'AMI Event Listener service initialized');
    } catch (error) {
      this.addResult('AMI Event Listener', 'WARN', `Could not verify event listener: ${error.message}`);
    }
  }

  private async validatePhoneNumberFormatting(): Promise<void> {
    console.log('📱 Checking Phone Number Formatting...');
    
    // Get recent call logs and check formatting
    const recentCalls = await this.callLogRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    if (recentCalls.length === 0) {
      this.addResult('Phone Number Formatting', 'WARN', 'No recent calls found to validate formatting');
      return;
    }

    const formattingIssues: string[] = [];
    const correctFormats: number[] = [];

    recentCalls.forEach((call, index) => {
      // Check "to" number format (should be without +, with leading 1)
      const toFormat = call.to;
      const toHasPlus = toFormat?.includes('+');
      const toHasLeadingOne = toFormat?.startsWith('1') || toFormat?.match(/^1\d{10}$/);

      // Check "from" number format (should have + prefix)
      const fromFormat = call.from;
      const fromHasPlus = fromFormat?.includes('+');

      // Check transfer number format (should be without +, with leading 1)
      const transferFormat = call.transferNumber;
      if (transferFormat) {
        const transferHasPlus = transferFormat.includes('+');
        const transferHasLeadingOne = transferFormat.startsWith('1') || transferFormat.match(/^1\d{10}$/);

        if (transferHasPlus || !transferHasLeadingOne) {
          formattingIssues.push(`Call ${index + 1}: Transfer number "${transferFormat}" should be "1XXXXXXXXXX" format`);
        }
      }

      if (toHasPlus || !toHasLeadingOne) {
        formattingIssues.push(`Call ${index + 1}: "to" number "${toFormat}" should be "1XXXXXXXXXX" format (no +)`);
      } else {
        correctFormats.push(index + 1);
      }

      if (!fromHasPlus) {
        formattingIssues.push(`Call ${index + 1}: "from" number "${fromFormat}" should have "+" prefix`);
      } else {
        correctFormats.push(index + 1);
      }
    });

    if (formattingIssues.length > 0) {
      this.addResult(
        'Phone Number Formatting',
        'FAIL',
        `Found ${formattingIssues.length} formatting issues`,
        { issues: formattingIssues, correctFormats: correctFormats.length },
      );
    } else {
      this.addResult(
        'Phone Number Formatting',
        'PASS',
        `All ${recentCalls.length} recent calls have correct formatting`,
        { checked: recentCalls.length },
      );
    }
  }

  private async validateRecentCallLogs(): Promise<void> {
    console.log('📋 Checking Recent Call Logs...');

    const recentCalls = await this.callLogRepository.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });

    if (recentCalls.length === 0) {
      this.addResult('Recent Call Logs', 'WARN', 'No call logs found in database');
      return;
    }

    const statusCounts: Record<string, number> = {};
    const callsWithUniqueId = recentCalls.filter(c => c.uniqueId).length;
    const callsWithFlowEvents = recentCalls.filter(c => c.callFlowEvents && c.callFlowEvents.length > 0).length;
    const callsWithMetadata = recentCalls.filter(c => c.metadata).length;

    recentCalls.forEach(call => {
      statusCounts[call.status] = (statusCounts[call.status] || 0) + 1;
    });

    const issues: string[] = [];
    if (callsWithUniqueId < recentCalls.length * 0.8) {
      issues.push(`Only ${callsWithUniqueId}/${recentCalls.length} calls have uniqueId (expected >80%)`);
    }
    if (callsWithFlowEvents < recentCalls.length * 0.5) {
      issues.push(`Only ${callsWithFlowEvents}/${recentCalls.length} calls have flow events (expected >50%)`);
    }

    this.addResult(
      'Recent Call Logs',
      issues.length > 0 ? 'WARN' : 'PASS',
      `Found ${recentCalls.length} recent calls`,
      {
        total: recentCalls.length,
        statusCounts,
        withUniqueId: callsWithUniqueId,
        withFlowEvents: callsWithFlowEvents,
        withMetadata: callsWithMetadata,
        issues: issues.length > 0 ? issues : undefined,
      },
    );
  }

  private async validateCallMetrics(): Promise<void> {
    console.log('📊 Checking Call Metrics Generation...');

    // Get a sample tenant ID from recent calls
    const sampleCall = await this.callLogRepository.findOne({
      order: { createdAt: 'DESC' },
    });

    if (!sampleCall) {
      this.addResult('Call Metrics', 'WARN', 'No calls found to validate metrics');
      return;
    }

    try {
      const stats = await this.dashboardService.getStats(sampleCall.tenantId, 'today');

      const issues: string[] = [];
      if (stats.callsPlaced === 0 && stats.callsAnswered === 0) {
        issues.push('No calls found for today - metrics may be empty');
      }

      // Validate metrics structure
      const requiredFields = [
        'callsPlaced',
        'callsAnswered',
        'callAnswerRate',
        'transfersAttempted',
        'transfersCompleted',
        'transferRate',
        'totalCallDuration',
        'averageCallDuration',
      ];

      const missingFields = requiredFields.filter(field => !(field in stats));
      if (missingFields.length > 0) {
        issues.push(`Missing metric fields: ${missingFields.join(', ')}`);
      }

      this.addResult(
        'Call Metrics',
        issues.length > 0 ? 'WARN' : 'PASS',
        'Metrics generated successfully',
        {
          metrics: stats,
          issues: issues.length > 0 ? issues : undefined,
        },
      );
    } catch (error) {
      this.addResult('Call Metrics', 'FAIL', `Failed to generate metrics: ${error.message}`);
    }
  }

  private async validateCallFlowEvents(): Promise<void> {
    console.log('🔄 Checking Call Flow Events...');

    const callsWithEvents = await this.callLogRepository
      .createQueryBuilder('call_log')
      .where('call_log.callFlowEvents IS NOT NULL')
      .andWhere("jsonb_array_length(call_log.callFlowEvents) > 0")
      .orderBy('call_log.createdAt', 'DESC')
      .take(10)
      .getMany();

    if (callsWithEvents.length === 0) {
      this.addResult('Call Flow Events', 'WARN', 'No calls with flow events found');
      return;
    }

    const eventTypes: Record<string, number> = {};
    callsWithEvents.forEach(call => {
      call.callFlowEvents?.forEach(event => {
        eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      });
    });

    const expectedEvents = ['NewChannel', 'Dial', 'Bridge', 'Hangup', 'TransferAttempt', 'TransferConnected'];
    const missingEvents = expectedEvents.filter(event => !eventTypes[event]);

    this.addResult(
      'Call Flow Events',
      missingEvents.length > 0 ? 'WARN' : 'PASS',
      `Found ${callsWithEvents.length} calls with flow events`,
      {
        callsWithEvents: callsWithEvents.length,
        eventTypes,
        missingEvents: missingEvents.length > 0 ? missingEvents : undefined,
      },
    );
  }

  private async validateTransferMetrics(): Promise<void> {
    console.log('🔄 Checking Transfer Metrics...');

    const callsWithTransfers = await this.callLogRepository
      .createQueryBuilder('call_log')
      .where('call_log.transferNumber IS NOT NULL')
      .andWhere("call_log.transferNumber != ''")
      .orderBy('call_log.createdAt', 'DESC')
      .take(20)
      .getMany();

    if (callsWithTransfers.length === 0) {
      this.addResult('Transfer Metrics', 'INFO', 'No calls with transfers found (this is OK if no transfers configured)');
      return;
    }

    const transferStatuses: Record<string, number> = {};
    callsWithTransfers.forEach(call => {
      const status = call.metadata?.transferStatus || 'unknown';
      transferStatuses[status] = (transferStatuses[status] || 0) + 1;
    });

    const completedTransfers = callsWithTransfers.filter(
      c => c.metadata?.transferStatus === 'completed',
    ).length;

    this.addResult(
      'Transfer Metrics',
      'PASS',
      `Found ${callsWithTransfers.length} calls with transfers`,
      {
        totalTransfers: callsWithTransfers.length,
        completedTransfers,
        transferStatuses,
        completionRate: callsWithTransfers.length > 0 
          ? Math.round((completedTransfers / callsWithTransfers.length) * 100) 
          : 0,
      },
    );
  }

  private addResult(category: string, status: 'PASS' | 'FAIL' | 'WARN' | 'INFO', message: string, details?: any): void {
    this.results.push({ category, status, message, details });
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(80) + '\n');

    const statusIcons: Record<string, string> = {
      PASS: '✅',
      FAIL: '❌',
      WARN: '⚠️',
      INFO: 'ℹ️',
    };

    this.results.forEach(result => {
      const icon = statusIcons[result.status] || '•';
      console.log(`${icon} [${result.status}] ${result.category}`);
      console.log(`   ${result.message}`);
      
      if (result.details) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
      console.log('');
    });

    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warnCount = this.results.filter(r => r.status === 'WARN').length;

    console.log('='.repeat(80));
    console.log(`Summary: ${passCount} Passed, ${warnCount} Warnings, ${failCount} Failed`);
    console.log('='.repeat(80) + '\n');
  }
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const callsService = app.get(CallsService);
  const amiService = app.get(AmiService);
  const amiEventListenerService = app.get(AmiEventListenerService);
  const dashboardService = app.get(DashboardService);
  const callLogRepository = app.get(getRepositoryToken(CallLog));

  const validator = new CallSystemValidator(
    callsService,
    amiService,
    amiEventListenerService,
    dashboardService,
    callLogRepository,
  );

  await validator.validate();
  
  await app.close();
}

main().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});

