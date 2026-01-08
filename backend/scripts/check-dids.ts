import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkDids() {
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
    const tenantId = '5246a145-c7b3-4e7e-b05e-4921ff3d064e'; // From the journey update

    // Get all DIDs for this tenant
    const allDids = await dataSource.query(
      `SELECT id, number, segment, trunk, status, "usageCount" 
       FROM asterisk_dids 
       WHERE "tenantId" = $1 
       ORDER BY segment, trunk, number`,
      [tenantId]
    );

    console.log(`\n📞 DIDs for tenant ${tenantId}:`);
    console.log(`Total DIDs: ${allDids.length}\n`);

    if (allDids.length === 0) {
      console.log('No DIDs found. You need to import DIDs.\n');
    } else {
      // Group by segment/trunk
      const grouped: Record<string, any[]> = {};
      for (const did of allDids) {
        const key = `${did.segment || 'none'}/${did.trunk || 'none'}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(did);
      }

      for (const [key, dids] of Object.entries(grouped)) {
        console.log(`${key}: ${dids.length} DIDs`);
        const twilioDids = dids.filter(d => 
          d.segment?.toLowerCase() === 'twilio' || 
          d.segment?.toLowerCase()?.startsWith('twilio-') ||
          d.trunk === 'TWILIO'
        );
        if (twilioDids.length > 0) {
          console.log(`  ✅ Twilio pool: ${twilioDids.length} DIDs`);
          twilioDids.slice(0, 5).forEach(d => {
            console.log(`     - ${d.number} (${d.status}, usage: ${d.usageCount || 0})`);
          });
          if (twilioDids.length > 5) {
            console.log(`     ... and ${twilioDids.length - 5} more`);
          }
        }
      }
    }

    // Check Twilio pool specifically
    const twilioDids = await dataSource.query(
      `SELECT id, number, segment, trunk, status 
       FROM asterisk_dids 
       WHERE "tenantId" = $1 
       AND (
         segment ILIKE 'twilio%' OR 
         trunk = 'TWILIO'
       )
       AND status = 'ACTIVE'`,
      [tenantId]
    );

    console.log(`\n🎯 Twilio Pool DIDs (Active): ${twilioDids.length}`);
    if (twilioDids.length === 0) {
      console.log('⚠️  No active Twilio DIDs found. You need to import Twilio numbers.\n');
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

checkDids();
