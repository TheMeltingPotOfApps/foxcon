import * as twilio from 'twilio';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function testCredentials() {
  try {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    const accountSid = process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID';
    const authToken = process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN';

    console.log('🔍 Testing Twilio Credentials...\n');
    console.log(`Account SID: ${accountSid}`);
    console.log(`Auth Token: ${authToken.substring(0, 10)}...\n`);

    const client = twilio(accountSid, authToken);

    // Try to fetch account info
    console.log('Attempting to fetch account information...');
    try {
      const account = await client.api.accounts(accountSid).fetch();
      console.log('✅ SUCCESS! Credentials are valid.');
      console.log(`Account Name: ${account.friendlyName}`);
      console.log(`Account Status: ${account.status}`);
    } catch (error: any) {
      console.log('❌ FAILED! Credentials are invalid.');
      console.log(`Error Code: ${error.code}`);
      console.log(`Error Message: ${error.message}`);
      console.log(`Status: ${error.status}`);
      if (error.moreInfo) {
        console.log(`More Info: ${error.moreInfo}`);
      }
      console.log('\nFull error:', JSON.stringify(error, null, 2));
    }

    // Try to list phone numbers
    console.log('\n\nAttempting to list phone numbers...');
    try {
      const numbers = await client.incomingPhoneNumbers.list({ limit: 5 });
      console.log(`✅ SUCCESS! Found ${numbers.length} phone numbers.`);
      if (numbers.length > 0) {
        console.log('Sample numbers:');
        numbers.forEach((num, idx) => {
          console.log(`  ${idx + 1}. ${num.phoneNumber} (SID: ${num.sid})`);
        });
      }
    } catch (error: any) {
      console.log('❌ FAILED to list phone numbers.');
      console.log(`Error Code: ${error.code}`);
      console.log(`Error Message: ${error.message}`);
      console.log(`Status: ${error.status}`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Unexpected Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testCredentials();

