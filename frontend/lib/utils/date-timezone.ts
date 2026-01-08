import { format, formatInTimeZone } from 'date-fns-tz';
import { useTenant } from '@/lib/hooks/use-tenant';

/**
 * Format a date/time in the user's timezone (tenant timezone for authenticated users)
 * @param date - Date to format
 * @param formatStr - Format string (default: 'MMM d, yyyy h:mm a')
 * @param tenantTimezone - Optional tenant timezone (will use browser timezone if not provided)
 * @returns Formatted date string
 */
export function formatInUserTimezone(
  date: Date | string,
  formatStr: string = 'MMM d, yyyy h:mm a',
  tenantTimezone?: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Use tenant timezone if provided, otherwise use browser timezone
  const timezone = tenantTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  try {
    return formatInTimeZone(dateObj, timezone, formatStr);
  } catch (error) {
    // Fallback to regular format if timezone formatting fails
    console.warn('Failed to format date in timezone:', error);
    return format(dateObj, formatStr);
  }
}

/**
 * Format a date/time in the lead's timezone (browser timezone or contact timezone)
 * @param date - Date to format
 * @param formatStr - Format string (default: 'MMM d, yyyy h:mm a')
 * @param contactTimezone - Optional contact timezone (from contact.attributes.timezone)
 * @returns Formatted date string
 */
export function formatInLeadTimezone(
  date: Date | string,
  formatStr: string = 'MMM d, yyyy h:mm a',
  contactTimezone?: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Use contact timezone if provided, otherwise use browser timezone
  const timezone = contactTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  try {
    return formatInTimeZone(dateObj, timezone, formatStr);
  } catch (error) {
    // Fallback to regular format if timezone formatting fails
    console.warn('Failed to format date in timezone:', error);
    return format(dateObj, formatStr);
  }
}

/**
 * Get the user's timezone (tenant timezone for authenticated users)
 * @param tenantTimezone - Optional tenant timezone
 * @returns Timezone string
 */
export function getUserTimezone(tenantTimezone?: string): string {
  return tenantTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get the lead's timezone (browser timezone or contact timezone)
 * @param contactTimezone - Optional contact timezone
 * @returns Timezone string
 */
export function getLeadTimezone(contactTimezone?: string): string {
  return contactTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * React hook to format dates in user timezone
 * Automatically uses tenant timezone if available
 */
export function useFormatInUserTimezone() {
  const { data: tenant } = useTenant();
  const tenantTimezone = tenant?.timezone;
  
  return (date: Date | string, formatStr: string = 'MMM d, yyyy h:mm a') => {
    return formatInUserTimezone(date, formatStr, tenantTimezone);
  };
}

