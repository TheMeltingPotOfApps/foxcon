import { Injectable } from '@nestjs/common';

/**
 * Service for handling timezone conversions and timezone-related utilities
 */
@Injectable()
export class TimezoneService {
  /**
   * Convert a date/time from one timezone to UTC
   * @param dateTime - Date/time string or Date object in the source timezone
   * @param sourceTimezone - Source timezone (e.g., 'America/New_York')
   * @returns Date object in UTC
   */
  convertToUTC(dateTime: Date | string, sourceTimezone: string): Date {
    if (!sourceTimezone) {
      // If no timezone provided, assume UTC
      return typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    }

    const dateStr = typeof dateTime === 'string' ? dateTime : dateTime.toISOString();
    
    // Parse the date string assuming it's in the source timezone
    // We'll use a library approach: create a date string with timezone info
    // Format: "2024-01-15T14:30:00" -> "2024-01-15T14:30:00-05:00" (for EST)
    
    // For now, we'll use a simpler approach: if dateTime is a Date object,
    // we assume it's already in UTC and return it
    // If it's a string without timezone, we'll parse it as if it's in sourceTimezone
    
    if (typeof dateTime === 'string') {
      // If the string already has timezone info (ends with Z or +/-), parse directly
      if (dateTime.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateTime)) {
        return new Date(dateTime);
      }
      
      // Otherwise, we need to interpret it in the source timezone
      // This is a simplified approach - in production, use a library like date-fns-tz
      // For now, we'll create a date and adjust based on timezone offset
      const date = new Date(dateTime);
      const utcDate = this.adjustForTimezone(date, sourceTimezone, false);
      return utcDate;
    }
    
    // If it's already a Date object, assume it's in UTC
    return dateTime;
  }

  /**
   * Convert a UTC date/time to a specific timezone
   * @param utcDate - Date object in UTC
   * @param targetTimezone - Target timezone (e.g., 'America/New_York')
   * @returns Date object representing the same moment in the target timezone
   */
  convertFromUTC(utcDate: Date, targetTimezone: string): Date {
    if (!targetTimezone) {
      return utcDate;
    }

    // Adjust the date to represent the same moment in the target timezone
    return this.adjustForTimezone(utcDate, targetTimezone, true);
  }

  /**
   * Convert a date/time from one timezone to another
   * @param dateTime - Date/time in source timezone
   * @param sourceTimezone - Source timezone
   * @param targetTimezone - Target timezone
   * @returns Date object representing the same moment in the target timezone
   */
  convertBetweenTimezones(
    dateTime: Date | string,
    sourceTimezone: string,
    targetTimezone: string,
  ): Date {
    // First convert to UTC, then to target timezone
    const utcDate = this.convertToUTC(dateTime, sourceTimezone);
    return this.convertFromUTC(utcDate, targetTimezone);
  }

  /**
   * Get the current time in a specific timezone
   * @param timezone - Target timezone
   * @returns Date object representing current time in the timezone
   */
  getCurrentTimeInTimezone(timezone: string): Date {
    const now = new Date();
    return this.convertFromUTC(now, timezone);
  }

  /**
   * Format a date/time string for a specific timezone
   * Returns a date string that can be parsed as if it's in the target timezone
   * @param date - Date object (assumed to be in UTC)
   * @param timezone - Target timezone
   * @returns ISO string adjusted for the timezone
   */
  formatForTimezone(date: Date, timezone: string): string {
    if (!timezone) {
      return date.toISOString();
    }

    // Get the offset for the timezone at this specific date
    const offset = this.getTimezoneOffset(date, timezone);
    const adjustedDate = new Date(date.getTime() - offset * 60000);
    
    // Format as ISO string without the Z, so it can be interpreted in the target timezone
    const year = adjustedDate.getUTCFullYear();
    const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getUTCDate()).padStart(2, '0');
    const hours = String(adjustedDate.getUTCHours()).padStart(2, '0');
    const minutes = String(adjustedDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(adjustedDate.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Parse a date/time string assuming it's in a specific timezone and convert to UTC
   * @param dateTimeStr - Date/time string (e.g., "2024-01-15T14:30:00")
   * @param timezone - Timezone the string is in
   * @returns Date object in UTC
   */
  parseInTimezone(dateTimeStr: string, timezone: string): Date {
    if (!timezone) {
      return new Date(dateTimeStr);
    }

    // If the string already has timezone info, parse directly
    if (dateTimeStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateTimeStr)) {
      return new Date(dateTimeStr);
    }

    // Parse the date string components
    const [datePart, timePart] = dateTimeStr.split('T');
    if (!datePart || !timePart) {
      throw new Error(`Invalid date format: ${dateTimeStr}`);
    }

    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);

    // Create a date object assuming it's in the specified timezone
    // We'll use the offset to adjust
    const localDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    const offset = this.getTimezoneOffset(localDate, timezone);
    
    // Adjust back to UTC
    return new Date(localDate.getTime() + offset * 60000);
  }

  /**
   * Get timezone offset in minutes for a specific date and timezone
   * This is a simplified implementation - in production, use a library like date-fns-tz
   */
  private getTimezoneOffset(date: Date, timezone: string): number {
    // This is a simplified implementation
    // In production, you should use a proper timezone library like:
    // - date-fns-tz
    // - moment-timezone
    // - luxon
    
    // For now, we'll use Intl.DateTimeFormat which is available in Node.js
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'longOffset',
      });
      
      const parts = formatter.formatToParts(date);
      const offsetPart = parts.find(part => part.type === 'timeZoneName');
      
      if (offsetPart) {
        // Parse offset like "GMT-05:00" or "GMT+02:00"
        const offsetStr = offsetPart.value.replace('GMT', '').trim();
        const [sign, hours, minutes] = offsetStr.match(/([+-])(\d{2}):(\d{2})/) || [];
        
        if (sign && hours && minutes) {
          const offsetMinutes = parseInt(hours) * 60 + parseInt(minutes);
          return sign === '+' ? -offsetMinutes : offsetMinutes; // Invert because we want UTC offset
        }
      }
    } catch (error) {
      console.warn(`Failed to get timezone offset for ${timezone}:`, error);
    }
    
    // Fallback: return 0 (UTC)
    return 0;
  }

  /**
   * Adjust a date for timezone conversion
   */
  private adjustForTimezone(date: Date, timezone: string, fromUTC: boolean): Date {
    const offset = this.getTimezoneOffset(date, timezone);
    const adjustment = fromUTC ? offset : -offset;
    return new Date(date.getTime() + adjustment * 60000);
  }

  /**
   * Validate a timezone string
   * @param timezone - Timezone string to validate
   * @returns true if valid, false otherwise
   */
  isValidTimezone(timezone: string): boolean {
    if (!timezone) {
      return false;
    }

    try {
      // Try to create a formatter with this timezone
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a list of common timezones
   * @returns Array of timezone objects with name and label
   */
  getCommonTimezones(): Array<{ value: string; label: string }> {
    return [
      { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
      { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
      { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
      { value: 'America/Phoenix', label: 'Arizona' },
      { value: 'America/Anchorage', label: 'Alaska' },
      { value: 'Pacific/Honolulu', label: 'Hawaii' },
      { value: 'America/Toronto', label: 'Toronto' },
      { value: 'America/Vancouver', label: 'Vancouver' },
      { value: 'America/Mexico_City', label: 'Mexico City' },
      { value: 'America/Sao_Paulo', label: 'São Paulo' },
      { value: 'Europe/London', label: 'London' },
      { value: 'Europe/Paris', label: 'Paris' },
      { value: 'Europe/Berlin', label: 'Berlin' },
      { value: 'Europe/Rome', label: 'Rome' },
      { value: 'Europe/Madrid', label: 'Madrid' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam' },
      { value: 'Europe/Stockholm', label: 'Stockholm' },
      { value: 'Europe/Moscow', label: 'Moscow' },
      { value: 'Asia/Dubai', label: 'Dubai' },
      { value: 'Asia/Kolkata', label: 'Mumbai, Kolkata, New Delhi' },
      { value: 'Asia/Shanghai', label: 'Beijing, Shanghai' },
      { value: 'Asia/Tokyo', label: 'Tokyo' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
      { value: 'Asia/Singapore', label: 'Singapore' },
      { value: 'Australia/Sydney', label: 'Sydney' },
      { value: 'Australia/Melbourne', label: 'Melbourne' },
      { value: 'Pacific/Auckland', label: 'Auckland' },
    ];
  }

  /**
   * Get default timezone (UTC)
   */
  getDefaultTimezone(): string {
    return 'UTC';
  }
}

