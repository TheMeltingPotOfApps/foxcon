import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TwilioService } from '../src/twilio/twilio.service';
import { DataSource, MoreThanOrEqual } from 'typeorm';
import { TwilioConfig } from '../src/entities/twilio-config.entity';
import { TwilioNumber } from '../src/entities/twilio-number.entity';
import { Message, MessageDirection } from '../src/entities/message.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as twilio from 'twilio';

async function diagnoseWebhooks() {
  try {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    console.log('🔍 Twilio Webhook Diagnostic Tool\n');
    console.log('='.repeat(80));
    console.log('This tool will:');
    console.log('1. Check webhook configuration for all tenants');
    console.log('2. Verify webhook URLs match expected values');
    console.log('3. Check recent inbound message activity');
    console.log('4. Identify any tenant-specific issues\n');
    console.log('='.repeat(80) + '\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const twilioService = app.get(TwilioService);
    const dataSource = app.get(DataSource);

    // Get all active Twilio configs (all tenants)
    const configs = await dataSource.getRepository(TwilioConfig).find({
      where: { isActive: true },
    });

    console.log(`Found ${configs.length} active Twilio configuration(s)\n`);

    if (configs.length === 0) {
      console.log('❌ No active Twilio configurations found');
      await app.close();
      process.exit(0);
    }

    // Get expected webhook URLs
    const baseUrl = process.env.BACKEND_URL || 
                    process.env.WEBHOOK_BASE_URL ||
                    'https://api.nurtureengine.net';
    
    let webhookBaseUrl = baseUrl;
    if (webhookBaseUrl.includes('localhost') || webhookBaseUrl.includes('127.0.0.1') || webhookBaseUrl.includes('34.29.105.211')) {
      webhookBaseUrl = 'https://api.nurtureengine.net';
    }
    if (!webhookBaseUrl.startsWith('https://')) {
      webhookBaseUrl = webhookBaseUrl.replace('http://', 'https://');
    }
    webhookBaseUrl = webhookBaseUrl.replace(/:(\d+)/, '');

    const expectedSmsUrl = `${webhookBaseUrl}/api/webhooks/twilio/inbound`;
    const expectedStatusUrl = `${webhookBaseUrl}/api/webhooks/twilio/status`;

    console.log(`Expected SMS Webhook URL: ${expectedSmsUrl}`);
    console.log(`Expected Status Callback URL: ${expectedStatusUrl}\n`);

    // Check recent inbound messages (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const recentMessages = await dataSource.getRepository(Message).find({
      where: {
        direction: MessageDirection.INBOUND,
        sentAt: MoreThanOrEqual(oneDayAgo),
      },
      order: { sentAt: 'DESC' },
      take: 50,
    });

    console.log(`\n📨 Recent Inbound Messages (last 24 hours): ${recentMessages.length}`);
    if (recentMessages.length > 0) {
      console.log('   Latest messages:');
      recentMessages.slice(0, 5).forEach((msg, idx) => {
        console.log(`   ${idx + 1}. [${msg.sentAt.toISOString()}] Tenant: ${msg.tenantId.substring(0, 8)}... | SID: ${msg.twilioMessageSid || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️  No inbound messages received in the last 24 hours');
    }

    // Check each tenant
    for (const config of configs) {
      console.log('\n' + '='.repeat(80));
      console.log(`\n🏢 Tenant: ${config.tenantId}`);
      console.log(`   Account SID: ${config.accountSid.substring(0, 8)}...`);
      console.log(`   Messaging Service SID: ${config.messagingServiceSid || 'Not configured'}`);

      try {
        // Verify webhooks using the service method
        const verification = await twilioService.verifyWebhooks(config.tenantId);

        // Get numbers for this tenant
        const numbers = await dataSource.getRepository(TwilioNumber).find({
          where: { tenantId: config.tenantId },
        });

        console.log(`\n   📱 Phone Numbers: ${numbers.length}`);
        
        if (numbers.length === 0) {
          console.log('   ⚠️  No phone numbers found for this tenant');
        } else {
          let correctCount = 0;
          let incorrectCount = 0;

          verification.numbers.forEach((num, idx) => {
            if (num.isCorrect) {
              correctCount++;
              console.log(`   ✅ ${num.phoneNumber}`);
              console.log(`      SMS URL: ${num.currentSmsUrl || '(not set)'}`);
              console.log(`      Status URL: ${num.currentStatusUrl || '(not set)'}`);
            } else {
              incorrectCount++;
              console.log(`   ❌ ${num.phoneNumber}`);
              console.log(`      Current SMS URL: ${num.currentSmsUrl || '(not set)'}`);
              console.log(`      Expected SMS URL: ${expectedSmsUrl}`);
              console.log(`      SMS URL Match: ${num.smsUrlMatches ? '✅' : '❌'}`);
              console.log(`      Current Status URL: ${num.currentStatusUrl || '(not set)'}`);
              console.log(`      Expected Status URL: ${expectedStatusUrl}`);
              console.log(`      Status URL Match: ${num.statusUrlMatches ? '✅' : '❌'}`);
              if (num.error) {
                console.log(`      Error: ${num.error}`);
              }
            }
          });

          console.log(`\n   Summary: ${correctCount} correct, ${incorrectCount} incorrect`);
        }

        // Check messaging service
        if (verification.messagingService.sid) {
          console.log(`\n   📡 Messaging Service: ${verification.messagingService.sid}`);
          if (verification.messagingService.isCorrect) {
            console.log(`   ✅ Messaging service webhooks configured correctly`);
            console.log(`      Inbound URL: ${verification.messagingService.inboundRequestUrl}`);
            console.log(`      Status URL: ${verification.messagingService.statusCallback}`);
          } else {
            console.log(`   ❌ Messaging service webhooks are incorrect`);
            console.log(`      Current Inbound URL: ${verification.messagingService.inboundRequestUrl || '(not set)'}`);
            console.log(`      Expected Inbound URL: ${expectedSmsUrl}`);
            console.log(`      Inbound URL Match: ${verification.messagingService.inboundUrlMatches ? '✅' : '❌'}`);
            console.log(`      Current Status URL: ${verification.messagingService.statusCallback || '(not set)'}`);
            console.log(`      Expected Status URL: ${expectedStatusUrl}`);
            console.log(`      Status URL Match: ${verification.messagingService.statusUrlMatches ? '✅' : '❌'}`);
            if (verification.messagingService.error) {
              console.log(`      Error: ${verification.messagingService.error}`);
            }
          }
        }

        // Check recent messages for this tenant
        const tenantMessages = recentMessages.filter(m => m.tenantId === config.tenantId);
        console.log(`\n   📨 Recent Inbound Messages for this tenant: ${tenantMessages.length}`);
        if (tenantMessages.length === 0) {
          console.log('   ⚠️  No inbound messages received in the last 24 hours for this tenant');
        } else {
          console.log('   Latest messages:');
          tenantMessages.slice(0, 3).forEach((msg, idx) => {
            console.log(`   ${idx + 1}. [${msg.sentAt.toISOString()}] SID: ${msg.twilioMessageSid || 'N/A'} | Body: ${msg.body?.substring(0, 50) || 'N/A'}...`);
          });
        }

      } catch (error: any) {
        console.log(`\n   ❌ Error checking tenant: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Diagnostic Summary:');
    console.log(`   Total tenants checked: ${configs.length}`);
    console.log(`   Expected SMS Webhook: ${expectedSmsUrl}`);
    console.log(`   Expected Status Webhook: ${expectedStatusUrl}`);
    console.log(`   Recent inbound messages (24h): ${recentMessages.length}`);
    console.log('\n💡 Recommendations:');
    console.log('   1. If webhooks are incorrect, run: POST /api/twilio/update-webhooks');
    console.log('   2. If no messages are being received, check:');
    console.log('      - Webhook URLs are accessible from the internet');
    console.log('      - SSL certificate is valid');
    console.log('      - Firewall allows Twilio IPs');
    console.log('      - Application logs for webhook requests');
    console.log('   3. Check Twilio console for webhook delivery logs');
    console.log('   4. Verify tenant IDs match between database and Twilio numbers\n');

    await app.close();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

diagnoseWebhooks();

