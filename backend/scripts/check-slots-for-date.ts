import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkSlotsForDate() {
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
    
    const eventTypeId = '9cf34723-45cc-4a75-aa4f-54d3c3d64fc2'; // qwerqew
    const checkDate = new Date('2025-12-30T00:00:00Z'); // December 30, 2025 UTC
    const startDate = new Date(checkDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(checkDate);
    endDate.setHours(23, 59, 59, 999);
    
    console.log(`\n🔍 Checking slots for event type: qwerqew`);
    console.log(`Date: ${checkDate.toISOString().split('T')[0]}\n`);
    
    // Check availability
    const availabilities = await dataSource.query(
      `SELECT id, "weeklySchedule", "startDate", "endDate", "blockedDates", "isActive", "assignedToUserId"
       FROM availabilities 
       WHERE "eventTypeId" = $1 AND "isActive" = true`,
      [eventTypeId]
    );
    
    console.log(`Found ${availabilities.length} active availability records\n`);
    
    // Check existing bookings
    const bookings = await dataSource.query(
      `SELECT id, "startTime", "endTime", status
       FROM calendar_events 
       WHERE "eventTypeId" = $1 
       AND "startTime" >= $2 
       AND "startTime" <= $3
       AND status = 'scheduled'`,
      [eventTypeId, startDate.toISOString(), endDate.toISOString()]
    );
    
    console.log(`Existing bookings on this date: ${bookings.length}`);
    if (bookings.length > 0) {
      bookings.forEach((booking: any) => {
        console.log(`  - ${booking.startTime} to ${booking.endTime} (${booking.status})`);
      });
    }
    
    // Check what day of week Dec 30, 2025 is
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][checkDate.getUTCDay()];
    console.log(`\nDay of week: ${dayOfWeek}`);
    
    availabilities.forEach((avail: any) => {
      const schedule = avail.weeklySchedule || {};
      const daySchedule = schedule[dayOfWeek.toUpperCase()];
      console.log(`\nAvailability ${avail.id.substring(0, 8)}...`);
      console.log(`  Assigned To User: ${avail.assignedToUserId || 'All users'}`);
      console.log(`  ${dayOfWeek} enabled: ${daySchedule?.enabled || false}`);
      if (daySchedule?.enabled) {
        console.log(`  Time range: ${daySchedule.startTime} - ${daySchedule.endTime}`);
      }
      console.log(`  Start Date: ${avail.startDate || 'None'}`);
      console.log(`  End Date: ${avail.endDate || 'None'}`);
      if (avail.blockedDates && avail.blockedDates.length > 0) {
        console.log(`  Blocked Dates: ${avail.blockedDates.join(', ')}`);
      }
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

checkSlotsForDate();
