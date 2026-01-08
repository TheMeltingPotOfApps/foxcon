'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarEvent } from '@/lib/hooks/use-calendar-events';
import { EventType } from '@/lib/hooks/use-event-types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { useFormatInUserTimezone } from '@/lib/utils/date-timezone';

interface CalendarViewProps {
  events: CalendarEvent[];
  eventTypes: EventType[];
  selectedEventTypeId: string | null;
  onEventTypeChange: (eventTypeId: string | null) => void;
}

export function CalendarView({ events, eventTypes, selectedEventTypeId, onEventTypeChange }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const formatInUserTimezone = useFormatInUserTimezone();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, date);
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Calendar View</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={selectedEventTypeId || ''}
                onChange={(e) => onEventTypeChange(e.target.value || null)}
                className="flex h-10 w-48 rounded-lg border-2 border-input bg-background px-4 py-2 text-sm"
              >
                <option value="">All Event Types</option>
                {eventTypes.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-4 py-2 text-sm font-medium min-w-[200px] text-center">
                  {format(currentDate, 'MMMM yyyy')}
                </span>
                <Button variant="outline" size="sm" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={index}
                  className={`min-h-[100px] border rounded-lg p-2 ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                    } ${isToday ? 'text-primary font-bold' : ''}`}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const eventType = eventTypes.find((et) => et.id === event.eventTypeId);
                      const startTime = formatInUserTimezone(new Date(event.startTime), 'h:mm a');
                      return (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                          title={`${startTime} - ${event.title}`}
                        >
                          {startTime} {event.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event List */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events
              .filter((e) => new Date(e.startTime) >= new Date())
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .slice(0, 10)
              .map((event) => {
                const eventType = eventTypes.find((et) => et.id === event.eventTypeId);
                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CalendarIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatInUserTimezone(new Date(event.startTime), 'MMM d, yyyy h:mm a')}
                          {event.attendeeName && ` • ${event.attendeeName}`}
                        </div>
                        {eventType && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {eventType.name} • {eventType.durationMinutes} min
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          event.status === 'SCHEDULED'
                            ? 'bg-blue-100 text-blue-800'
                            : event.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-800'
                            : event.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            {events.filter((e) => new Date(e.startTime) >= new Date()).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming events
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

