import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TwilioService } from '../src/twilio/twilio.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function updateCredentialsOnly() {
  try {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    const accountSid = process.argv[2];
    const authToken = process.argv[3];
    const messagingServiceSid = process.argv[4];

    if (!accountSid || !authToken) {
      console.error('Usage: npx ts-node scripts/update-twilio-creds-only.ts <accountSid> <authToken> [messagingServiceSid]');
      process.exit(1);
    }

    console.log('🔧 Updating Twilio Credentials (without webhook update)...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const twilioService = app.get(TwilioService);

    // Get tenant ID
    const { execSync } = require('child_process');
    const tenantId = execSync(
      `export $(grep -v "^#" ${path.join(__dirname, '..', '.env')} | grep -E "^DB_" | xargs) && export PGPASSWORD="$DB_PASSWORD" && psql -h "${process.env.DB_HOST || 'localhost'}" -p "${process.env.DB_PORT || '5433'}" -U "${process.env.DB_USERNAME || 'sms_user'}" -d "${process.env.DB_DATABASE || 'sms_platform'}" -t -c "SELECT \\"tenantId\\" FROM twilio_configs WHERE \\"isActive\\" = true LIMIT 1;" 2>&1 | grep -v "^$" | head -1`
    )
      .toString()
      .trim()
      .replace(/\s+/g, '');

    console.log(`Tenant ID: ${tenantId}\n`);

    // Test credentials first
    console.log('🔍 Testing credentials...');
    const testResult = await twilioService.testConnection(tenantId);
    if (!testResult.success) {
      // Try with new credentials
      const twilio = require('twilio');
      const testClient = twilio(accountSid, authToken);
      try {
        await testClient.api.accounts(accountSid).fetch();
        console.log('✅ New credentials are valid!\n');
      } catch (error: any) {
        throw new Error(`Invalid credentials: ${error.message}`);
      }
    } else {
      console.log('✅ Current credentials are valid\n');
    }

    // Update directly in database using the service's repository
    const { InjectRepository } = require('@nestjs/typeorm');
    const { TwilioConfig } = require('../src/entities/twilio-config.entity');
    const { getRepositoryToken } = require('@nestjs/typeorm');
    const { Repository } = require('typeorm');
    
    const repo = app.get(getRepositoryToken(TwilioConfig));
    const config = await repo.findOne({ where: { tenantId, isActive: true } });
    if (config) {
      config.accountSid = accountSid;
      config.authToken = authToken;
      if (messagingServiceSid) {
        config.messagingServiceSid = messagingServiceSid;
      }
      await repo.save(config);
      console.log('✅ Credentials updated in database!\n');
    } else {
      throw new Error('Twilio config not found');
    }

    // Test again with updated credentials
    console.log('🔍 Testing updated credentials...');
    const newTestResult = await twilioService.testConnection(tenantId);
    if (newTestResult.success) {
      console.log('✅ Connection test passed!\n');
      console.log('You can now run the webhook update script:');
      console.log('  npx ts-node scripts/update-twilio-webhooks-direct.ts\n');
    } else {
      console.log(`❌ Connection test failed: ${newTestResult.message}`);
    }

    await app.close();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

updateCredentialsOnly();

