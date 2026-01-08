import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TwilioService } from '../src/twilio/twilio.service';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

async function updateCredentials() {
  try {
    // Load environment variables
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    console.log('🔧 Twilio Credentials Update Tool\n');
    console.log('You can find your Twilio credentials at: https://console.twilio.com/\n');

    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    // Get credentials from user
    const accountSid = await question('Enter Twilio Account SID: ');
    const authToken = await question('Enter Twilio Auth Token: ');
    const messagingServiceSid = await question('Enter Messaging Service SID (optional, press Enter to skip): ');

    rl.close();

    if (!accountSid || !authToken) {
      throw new Error('Account SID and Auth Token are required');
    }

    console.log('\n🔍 Validating credentials...\n');

    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);
    const twilioService = app.get(TwilioService);

    // Get tenant ID from database
    const { execSync } = require('child_process');
    const tenantId = execSync(
      `export $(grep -v "^#" ${path.join(__dirname, '..', '.env')} | grep -E "^DB_" | xargs) && export PGPASSWORD="$DB_PASSWORD" && psql -h "${process.env.DB_HOST || 'localhost'}" -p "${process.env.DB_PORT || '5433'}" -U "${process.env.DB_USERNAME || 'sms_user'}" -d "${process.env.DB_DATABASE || 'sms_platform'}" -t -c "SELECT \\"tenantId\\" FROM twilio_configs WHERE \\"isActive\\" = true LIMIT 1;" 2>&1 | grep -v "^$" | head -1`
    )
      .toString()
      .trim()
      .replace(/\s+/g, '');

    if (!tenantId || tenantId.length < 30) {
      throw new Error('Could not retrieve tenant ID from database');
    }

    console.log(`Tenant ID: ${tenantId}\n`);

    // Update credentials
    console.log('📝 Updating Twilio credentials...');
    const config = await twilioService.createConfig(
      tenantId,
      accountSid.trim(),
      authToken.trim(),
      messagingServiceSid?.trim() || undefined,
    );

    console.log('\n✅ Credentials updated successfully!');
    console.log(`Account SID: ${config.accountSid}`);
    console.log(`Messaging Service SID: ${config.messagingServiceSid || 'Not set'}`);

    // Test connection
    console.log('\n🔍 Testing connection...');
    const testResult = await twilioService.testConnection(tenantId);
    if (testResult.success) {
      console.log('✅ Connection test passed!\n');
      
      // Update webhooks
      console.log('🔧 Updating webhooks for all phone numbers and messaging service...');
      console.log('This may take a few minutes for 1,530+ phone numbers...\n');
      
      const webhookResult = await twilioService.updateAllWebhooks(tenantId);
      console.log('\n✅ Webhook update completed!');
      console.log(JSON.stringify(webhookResult, null, 2));
    } else {
      console.log(`❌ Connection test failed: ${testResult.message}`);
      console.log('Please verify your credentials are correct.');
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

updateCredentials();

