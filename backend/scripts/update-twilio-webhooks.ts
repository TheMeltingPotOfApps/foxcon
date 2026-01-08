import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const API_BASE = 'http://localhost:5002';

console.log('🔧 Updating Twilio Webhooks...\n');
console.log(`API Base: ${API_BASE}\n`);

// Login credentials
const loginEmail = 'Steven@UpwardFinancial.org';
const loginPassword = 'Temp123!';

async function updateWebhooks() {
  try {
    console.log('Step 1: Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: loginEmail,
      password: loginPassword,
    }, {
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.data)}`);
    }
    const token = loginResponse.data.accessToken;
    if (!token) {
      throw new Error('No token received from login');
    }
    console.log('✅ Login successful\n');

    console.log('Step 2: Updating Twilio webhooks...');
    console.log('This may take a few minutes for 1,530+ phone numbers...\n');
    const updateResponse = await axios.post(
      `${API_BASE}/api/twilio/update-webhooks`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 300000, // 5 minutes timeout for updating many numbers
      }
    );

    console.log('\n✅ Webhook update successful!');
    console.log(JSON.stringify(updateResponse.data, null, 2));
  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('\n💡 Tip: Login failed. Please check credentials.');
    }
    process.exit(1);
  }
}

updateWebhooks();

