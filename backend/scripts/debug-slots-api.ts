import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function debugSlotsAPI() {
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
    
    const eventTypeId = '9cf34723-45cc-4a75-aa4f-54d3c3d64fc2';
    const tenantId = '5246a145-c7b3-4e7e-b05e-4921ff3d064e';
    
    // Simulate frontend request: next 30 days from today
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    endDate.setHours(23, 59, 59, 999);
    
    console.log(`\n🔍 Debugging slots API`);
    console.log(`Event Type: ${eventTypeId}`);
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Today: ${new Date().toISOString()}`);
    console.log(`January 1, 2026: ${new Date('2026-01-01').toISOString()}\n`);
    
    // Check if Jan 1, 2026 is in range
    const jan1 = new Date('2026-01-01T00:00:00Z');
    if (jan1 < startDate || jan1 > endDate) {
      console.log(`❌ January 1, 2026 is OUTSIDE the requested date range!`);
      console.log(`   Start: ${startDate.toISOString()}`);
      console.log(`   End: ${endDate.toISOString()}`);
      console.log(`   Jan 1: ${jan1.toISOString()}\n`);
    } else {
      console.log(`✅ January 1, 2026 is WITHIN the requested date range\n`);
    }
    
    // Get availability
    const availabilities = await dataSource.query(
      `SELECT id, "assignedToUserId", "weeklySchedule", "startDate", "endDate", "blockedDates", "isActive"
       FROM availabilities 
       WHERE "eventTypeId" = $1 
       AND "isActive" = true`,
      [eventTypeId]
    );
    
    console.log(`Found ${availabilities.length} availability records\n`);
    
    // Check Jan 1, 2026 specifically
    const jan1DayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][jan1.getUTCDay()];
    console.log(`January 1, 2026 is a ${jan1DayOfWeek}\n`);
    
    availabilities.forEach((avail: any) => {
      const schedule = avail.weeklySchedule || {};
      const daySchedule = schedule[jan1DayOfWeek];
      console.log(`Availability ${avail.id.substring(0, 8)}...`);
      console.log(`  ${jan1DayOfWeek} enabled: ${daySchedule?.enabled || false}`);
      if (daySchedule?.enabled) {
        console.log(`  Time range: ${daySchedule.startTime} - ${daySchedule.endTime}`);
      }
      if (avail.startDate) {
        const startDate = new Date(avail.startDate);
        console.log(`  Start Date: ${startDate.toISOString().split('T')[0]}`);
        if (jan1 < startDate) {
          console.log(`    ⚠️  Jan 1 is BEFORE start date!`);
        }
      }
      if (avail.endDate) {
        const endDate = new Date(avail.endDate);
        console.log(`  End Date: ${endDate.toISOString().split('T')[0]}`);
        if (jan1 > endDate) {
          console.log(`    ⚠️  Jan 1 is AFTER end date!`);
        }
      }
      if (avail.blockedDates && avail.blockedDates.includes('2026-01-01')) {
        console.log(`  ⚠️  Jan 1 is BLOCKED!`);
      }
      console.log('');
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

debugSlotsAPI();
