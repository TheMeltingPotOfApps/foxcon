'use client';

import { Select } from '@/components/ui/select';

export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
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

interface TimezoneSelectorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
}

export function TimezoneSelector({
  value,
  onChange,
  id,
  className,
  placeholder = 'Select timezone...',
}: TimezoneSelectorProps) {
  // Auto-detect browser timezone if value is empty
  const getBrowserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  };

  const displayValue = value || getBrowserTimezone();

  return (
    <Select
      id={id}
      value={displayValue}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">{placeholder}</option>
      {COMMON_TIMEZONES.map((tz) => (
        <option key={tz.value} value={tz.value}>
          {tz.label}
        </option>
      ))}
    </Select>
  );
}

