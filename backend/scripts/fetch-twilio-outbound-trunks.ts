import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TwilioService } from '../src/twilio/twilio.service';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as twilio from 'twilio';

async function fetchOutboundTrunks() {
  try {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    console.log('🔍 Fetching Outbound Trunks from Twilio...\n');

    // Create NestJS application context
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

    // Get Twilio config
    const config = await twilioService.getConfig(tenantId);
    const client = twilio(config.accountSid, config.authToken);

    console.log('📞 Fetching Phone Numbers (Outbound Trunks)...\n');

    // Fetch all incoming phone numbers (can be used for outbound)
    const incomingNumbers = await client.incomingPhoneNumbers.list();
    
    console.log(`Found ${incomingNumbers.length} phone numbers:\n`);
    console.log('='.repeat(100));
    console.log(
      'Phone Number'.padEnd(20) +
      'SID'.padEnd(35) +
      'Voice'.padEnd(8) +
      'SMS'.padEnd(8) +
      'MMS'.padEnd(8) +
      'Status'.padEnd(12) +
      'Friendly Name'
    );
    console.log('='.repeat(100));

    const voiceCapable: any[] = [];
    const smsCapable: any[] = [];
    const allCapable: any[] = [];

    for (const number of incomingNumbers) {
      const voice = number.capabilities?.voice ? '✓' : '✗';
      const sms = number.capabilities?.sms ? '✓' : '✗';
      const mms = number.capabilities?.mms ? '✓' : '✗';
      
      console.log(
        number.phoneNumber.padEnd(20) +
        number.sid.padEnd(35) +
        voice.padEnd(8) +
        sms.padEnd(8) +
        mms.padEnd(8) +
        (number.status || 'unknown').padEnd(12) +
        (number.friendlyName || '-')
      );

      // Categorize numbers
      if (number.capabilities?.voice) {
        voiceCapable.push(number);
      }
      if (number.capabilities?.sms) {
        smsCapable.push(number);
      }
      if (number.capabilities?.voice && number.capabilities?.sms) {
        allCapable.push(number);
      }
    }

    console.log('='.repeat(100));
    console.log('\n📊 Summary:');
    console.log(`  Total Numbers: ${incomingNumbers.length}`);
    console.log(`  Voice Capable: ${voiceCapable.length}`);
    console.log(`  SMS Capable: ${smsCapable.length}`);
    console.log(`  Voice + SMS: ${allCapable.length}`);

    // Check for SIP Trunks (if any)
    console.log('\n📡 Checking for SIP Trunks...\n');
    try {
      const sipTrunks = await client.trunking.v1.trunks.list();
      if (sipTrunks.length > 0) {
        console.log(`Found ${sipTrunks.length} SIP Trunk(s):\n`);
        for (const trunk of sipTrunks) {
          console.log(`  - ${trunk.friendlyName || trunk.sid}`);
          console.log(`    SID: ${trunk.sid}`);
          console.log('');
        }
      } else {
        console.log('No SIP Trunks found.\n');
      }
    } catch (error: any) {
      // SIP trunks might not be available in all accounts
      if (error.code === 20003 || error.message?.includes('Authenticate')) {
        console.log('Unable to check SIP Trunks (authentication issue).\n');
      } else {
        console.log('No SIP Trunks configured (or not available in this account).\n');
      }
    }

    // Show recommended outbound trunks (voice-capable numbers)
    if (voiceCapable.length > 0) {
      console.log('\n✅ Recommended Outbound Trunks (Voice Capable):');
      voiceCapable.slice(0, 10).forEach((num, idx) => {
        console.log(`  ${idx + 1}. ${num.phoneNumber} (${num.sid})`);
      });
      if (voiceCapable.length > 10) {
        console.log(`  ... and ${voiceCapable.length - 10} more`);
      }
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

fetchOutboundTrunks();

