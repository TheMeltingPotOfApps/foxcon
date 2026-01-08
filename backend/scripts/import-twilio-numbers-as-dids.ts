import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TwilioService } from '../src/twilio/twilio.service';
import { DidsService } from '../src/asterisk/dids.service';
import { DidStatus } from '../src/entities/asterisk-did.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as twilio from 'twilio';

async function importTwilioNumbersAsDids() {
  try {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    const segmentName = process.argv[2] || 'twilio-main';
    const trunkName = process.argv[3] || 'TWILIO';

    console.log('📞 Importing Twilio Numbers as Segmented DIDs...\n');
    console.log(`Segment: ${segmentName}`);
    console.log(`Trunk: ${trunkName}\n`);

    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);
    const twilioService = app.get(TwilioService);
    const didsService = app.get(DidsService);

    // Get tenant ID
    const { execSync } = require('child_process');
    const tenantId = execSync(
      `export $(grep -v "^#" ${path.join(__dirname, '..', '.env')} | grep -E "^DB_" | xargs) && export PGPASSWORD="$DB_PASSWORD" && psql -h "${process.env.DB_HOST || 'localhost'}" -p "${process.env.DB_PORT || '5433'}" -U "${process.env.DB_USERNAME || 'sms_user'}" -d "${process.env.DB_DATABASE || 'sms_platform'}" -t -c "SELECT \\"tenantId\\" FROM twilio_configs WHERE \\"isActive\\" = true LIMIT 1;" 2>&1 | grep -v "^$" | head -1`
    )
      .toString()
      .trim()
      .replace(/\s+/g, '');

    console.log(`Tenant ID: ${tenantId}\n`);

    // Get Twilio config
    const config = await twilioService.getConfig(tenantId);
    const client = twilio(config.accountSid, config.authToken);

    console.log('📞 Fetching Twilio Phone Numbers...\n');

    // Fetch all incoming phone numbers
    const incomingNumbers = await client.incomingPhoneNumbers.list();
    
    console.log(`Found ${incomingNumbers.length} Twilio phone numbers\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const number of incomingNumbers) {
      try {
        // Check if DID already exists
        const existing = await didsService.findAll(tenantId);
        const existingDid = existing.find(d => d.number === number.phoneNumber);

        if (existingDid) {
          // Update existing DID with segment and trunk info
          const updatedMetadata = {
            ...(existingDid.metadata || {}),
            provider: 'Twilio',
            twilioSid: number.sid,
            capabilities: number.capabilities,
            friendlyName: number.friendlyName,
            importedFrom: 'twilio-api',
            importedAt: new Date(),
          };
          
          await didsService.update(tenantId, existingDid.id, {
            segment: segmentName,
            trunk: trunkName,
            metadata: updatedMetadata,
          });
          console.log(`✓ Updated: ${number.phoneNumber} (${number.sid.substring(0, 20)}...)`);
          imported++;
        } else {
          // Create new DID
          await didsService.create(tenantId, {
            number: number.phoneNumber,
            trunk: trunkName,
            segment: segmentName,
            status: DidStatus.ACTIVE,
            metadata: {
              provider: 'Twilio',
              twilioSid: number.sid,
              capabilities: number.capabilities,
              friendlyName: number.friendlyName,
              region: number.phoneNumber.startsWith('+1') ? 'US' : 'International',
              importedFrom: 'twilio-api',
              importedAt: new Date(),
            },
          });
          console.log(`✓ Imported: ${number.phoneNumber} (${number.sid.substring(0, 20)}...)`);
          imported++;
        }
      } catch (error: any) {
        console.error(`✗ Error importing ${number.phoneNumber}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log(`  Total Numbers: ${incomingNumbers.length}`);
    console.log(`  Imported/Updated: ${imported}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Segment: ${segmentName}`);
    console.log(`  Trunk: ${trunkName}`);
    console.log('='.repeat(60));

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

importTwilioNumbersAsDids();

