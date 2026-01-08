'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  disabled,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const isSameMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selected) return false;
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const handleDateClick = (date: Date) => {
    if (disabled && disabled(date)) return;
    if (!isSameMonth(date)) return;
    onSelect?.(date);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={cn('p-3', className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={previousMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={nextMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          const isDisabled = disabled ? disabled(date) : false;
          const isOtherMonth = !isSameMonth(date);
          const isSelectedDate = isSelected(date);
          const isTodayDate = isToday(date);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={isDisabled || isOtherMonth}
              className={cn(
                'h-9 w-9 text-sm rounded-md transition-colors',
                isOtherMonth && 'text-muted-foreground opacity-50',
                isDisabled && 'opacity-50 cursor-not-allowed',
                isSelectedDate && 'bg-primary text-primary-foreground',
                !isSelectedDate && !isDisabled && !isOtherMonth && 'hover:bg-accent',
                isTodayDate && !isSelectedDate && 'border border-primary',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

