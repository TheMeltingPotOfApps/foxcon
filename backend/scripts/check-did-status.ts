import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkDidStatus() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'sms',
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    const tenantId = '5246a145-c7b3-4e7e-b05e-4921ff3d064e';

    // Check status values
    const statusCheck = await dataSource.query(
      `SELECT status, COUNT(*) as count 
       FROM asterisk_dids 
       WHERE "tenantId" = $1 
       AND trunk = 'TWILIO'
       GROUP BY status`,
      [tenantId]
    );

    console.log('Status distribution for TWILIO DIDs:');
    statusCheck.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });

    // Check what the enum values should be
    const enumCheck = await dataSource.query(`
      SELECT unnest(enum_range(NULL::did_status)) as status_value;
    `);

    console.log('\nAvailable status enum values:');
    enumCheck.forEach(row => {
      console.log(`  ${row.status_value}`);
    });

    // Check Twilio pool with different status checks
    const twilioPool1 = await dataSource.query(
      `SELECT COUNT(*) as count 
       FROM asterisk_dids 
       WHERE "tenantId" = $1 
       AND trunk = 'TWILIO'
       AND segment ILIKE 'twilio%'
       AND status = 'ACTIVE'`,
      [tenantId]
    );

    const twilioPool2 = await dataSource.query(
      `SELECT COUNT(*) as count 
       FROM asterisk_dids 
       WHERE "tenantId" = $1 
       AND trunk = 'TWILIO'
       AND segment ILIKE 'twilio%'
       AND status = 'active'`,
      [tenantId]
    );

    const twilioPool3 = await dataSource.query(
      `SELECT COUNT(*) as count 
       FROM asterisk_dids 
       WHERE "tenantId" = $1 
       AND trunk = 'TWILIO'
       AND segment ILIKE 'twilio%'
       AND status IN ('ACTIVE', 'active', 'AVAILABLE')`,
      [tenantId]
    );

    console.log(`\nTwilio Pool Counts:`);
    console.log(`  status='ACTIVE': ${twilioPool1[0].count}`);
    console.log(`  status='active': ${twilioPool2[0].count}`);
    console.log(`  status IN ('ACTIVE','active','AVAILABLE'): ${twilioPool3[0].count}`);

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

checkDidStatus();
