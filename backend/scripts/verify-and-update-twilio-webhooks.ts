import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TwilioService } from '../src/twilio/twilio.service';
import { DataSource } from 'typeorm';
import { TwilioNumber } from '../src/entities/twilio-number.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as twilio from 'twilio';

async function verifyAndUpdateWebhooks() {
  try {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    console.log('🔍 Verifying and updating Twilio webhook endpoints...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const twilioService = app.get(TwilioService);
    const dataSource = app.get(DataSource);

    // Get tenant ID from database
    const tenantId = await dataSource.query(
      `SELECT "tenantId" FROM twilio_configs WHERE "isActive" = true LIMIT 1`
    ).then((rows: any[]) => rows[0]?.tenantId);

    if (!tenantId) {
      throw new Error('Could not retrieve tenant ID from database');
    }

    console.log(`Tenant ID: ${tenantId}\n`);

    // Get Twilio config
    const config = await twilioService['getConfig'](tenantId);
    const client = twilio(config.accountSid, config.authToken);

    // Get base URL for webhooks
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

    // Get all Twilio numbers from database
    const numbers = await dataSource.getRepository(TwilioNumber).find({
      where: { tenantId },
    });

    console.log(`Found ${numbers.length} Twilio numbers in database\n`);

    let numbersNeedingUpdate = 0;
    let numbersUpdated = 0;
    let errors = 0;

    for (const number of numbers) {
      try {
        // Fetch current webhook configuration from Twilio
        const twilioNumber = await client.incomingPhoneNumbers(number.twilioSid).fetch();
        
        const currentSmsUrl = twilioNumber.smsUrl || '';
        const currentStatusUrl = twilioNumber.statusCallback || '';

        const needsUpdate = currentSmsUrl !== expectedSmsUrl || currentStatusUrl !== expectedStatusUrl;

        if (needsUpdate) {
          numbersNeedingUpdate++;
          console.log(`📱 ${number.phoneNumber} (${number.twilioSid.substring(0, 8)}...)`);
          console.log(`   Current SMS URL: ${currentSmsUrl || '(not set)'}`);
          console.log(`   Expected SMS URL: ${expectedSmsUrl}`);
          console.log(`   Updating...`);

          await client.incomingPhoneNumbers(number.twilioSid).update({
            smsUrl: expectedSmsUrl,
            smsMethod: 'POST',
            statusCallback: expectedStatusUrl,
            statusCallbackMethod: 'POST',
          });

          numbersUpdated++;
          console.log(`   ✅ Updated successfully\n`);
        } else {
          console.log(`✅ ${number.phoneNumber} - webhooks already configured correctly\n`);
        }
      } catch (error: any) {
        errors++;
        console.error(`❌ Error updating ${number.phoneNumber}: ${error.message}\n`);
      }
    }

    // Update messaging service if configured
    let messagingServiceUpdated = false;
    if (config.messagingServiceSid) {
      try {
        console.log(`\nUpdating messaging service ${config.messagingServiceSid}...`);
        await client.messaging.v1.services(config.messagingServiceSid).update({
          inboundRequestUrl: expectedSmsUrl,
          inboundMethod: 'POST',
          statusCallback: expectedStatusUrl,
          fallbackUrl: expectedSmsUrl,
          fallbackMethod: 'POST',
        });
        messagingServiceUpdated = true;
        console.log(`✅ Messaging service updated successfully\n`);
      } catch (error: any) {
        console.error(`❌ Error updating messaging service: ${error.message}\n`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total numbers: ${numbers.length}`);
    console.log(`   Numbers needing update: ${numbersNeedingUpdate}`);
    console.log(`   Numbers updated: ${numbersUpdated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Messaging service updated: ${messagingServiceUpdated ? 'Yes' : 'No'}`);

    await app.close();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyAndUpdateWebhooks();
