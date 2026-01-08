const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const superAdminConfig = {
  email: process.env.SUPER_ADMIN_EMAIL || 'admin@nurtureengine.net',
  password: process.env.SUPER_ADMIN_PASSWORD || 'Admin123!@#',
  firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'App',
  lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Owner',
  tenantName: process.env.SUPER_ADMIN_TENANT_NAME || 'NurtureEngine',
};

const postData = JSON.stringify(superAdminConfig);

const options = {
  hostname: new URL(API_URL).hostname,
  port: new URL(API_URL).port || 3000,
  path: '/api/setup/create-super-admin',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

console.log('Creating super admin account...');
console.log(`API URL: ${API_URL}`);
console.log(`Email: ${superAdminConfig.email}`);
console.log(`Tenant: ${superAdminConfig.tenantName}`);
console.log('');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ Super admin account created successfully!');
      console.log('\nLogin credentials:');
      console.log(`  Email: ${superAdminConfig.email}`);
      console.log(`  Password: ${superAdminConfig.password}`);
      console.log(`  Tenant: ${response.tenant?.name || superAdminConfig.tenantName}`);
      console.log('\nNext steps:');
      console.log('1. Log in at http://localhost:5001/login (or your frontend URL)');
      console.log('2. Navigate to /super-admin for the dashboard');
      console.log('3. Navigate to /super-admin/limits for limits & pricing management');
    } else {
      console.error(`✗ Failed to create super admin (Status: ${res.statusCode})`);
      console.error('Response:', data);
      try {
        const error = JSON.parse(data);
        if (error.message) {
          console.error(`Error: ${error.message}`);
        }
      } catch (e) {
        console.error('Raw response:', data);
      }
    }
  });
});

req.on('error', (error) => {
  console.error('✗ Request failed:', error.message);
  console.error('\nMake sure the backend API is running at', API_URL);
  console.error('You can start it with: cd /root/SMS && npm run start:dev');
});

req.write(postData);
req.end();

