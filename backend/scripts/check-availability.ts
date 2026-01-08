import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkAvailability() {
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
    
    // Get all event types
    const eventTypes = await dataSource.query(
      `SELECT id, name, "tenantId" FROM event_types LIMIT 10`
    );
    
    console.log(`\n📅 Found ${eventTypes.length} event types:\n`);
    
    for (const eventType of eventTypes) {
      const availabilities = await dataSource.query(
        `SELECT id, "eventTypeId", "assignedToUserId", "weeklySchedule", "startDate", "endDate", "blockedDates", "isActive", "maxEventsPerSlot"
         FROM availabilities 
         WHERE "eventTypeId" = $1 AND "isActive" = true`,
        [eventType.id]
      );
      
      console.log(`Event Type: ${eventType.name} (${eventType.id.substring(0, 8)}...)`);
      console.log(`  Availabilities: ${availabilities.length}`);
      
      if (availabilities.length > 0) {
        availabilities.forEach((avail: any) => {
          const schedule = avail.weeklySchedule || {};
          const enabledDays = Object.keys(schedule).filter(
            (day) => schedule[day]?.enabled
          );
          console.log(`    - Availability ${avail.id.substring(0, 8)}...`);
          console.log(`      Enabled days: ${enabledDays.length > 0 ? enabledDays.join(', ') : 'NONE'}`);
          if (enabledDays.length > 0) {
            enabledDays.forEach((day: string) => {
              const daySchedule = schedule[day];
              console.log(`        ${day}: ${daySchedule.startTime} - ${daySchedule.endTime}`);
            });
          }
          console.log(`      Start Date: ${avail.startDate || 'None'}`);
          console.log(`      End Date: ${avail.endDate || 'None'}`);
          console.log(`      Blocked Dates: ${avail.blockedDates?.length || 0}`);
        });
      } else {
        console.log(`    ⚠️  No active availability records found!`);
      }
      console.log('');
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

checkAvailability();
