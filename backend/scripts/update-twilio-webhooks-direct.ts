import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TwilioService } from '../src/twilio/twilio.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function updateWebhooks() {
  try {
    // Load environment variables
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    console.log('🔧 Updating Twilio Webhooks...\n');

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
    
    // Skip connection test and proceed directly to webhook update
    // The webhook update will fail with a more specific error if credentials are invalid
    console.log('Updating webhooks for all phone numbers and messaging service...');
    console.log('This may take a few minutes for 1,530+ phone numbers...\n');

    const result = await twilioService.updateAllWebhooks(tenantId);

    console.log('\n✅ Webhook update successful!');
    console.log(JSON.stringify(result, null, 2));

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

updateWebhooks();

