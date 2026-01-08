'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { useBookingEventType, useAvailableBookingSlots, useCreateBooking } from '@/lib/hooks/use-calendar-booking';
import { format, addDays, addMinutes, isSameDay, setHours, setMinutes, startOfDay } from 'date-fns';
import { formatInLeadTimezone } from '@/lib/utils/date-timezone';
import { toast } from 'sonner';
import { Clock, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export default function PublicBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventTypeId = params.eventTypeId as string;
  const leadId = searchParams.get('leadId') || searchParams.get('contactId') || undefined;
  
  // Use leadId as contactId for backward compatibility
  const contactId = leadId;

  const { data: bookingData, isLoading } = useBookingEventType(eventTypeId, contactId, leadId);
  const [contact, setContact] = useState<any>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const createBooking = useCreateBooking();
  
  // Fetch contact data publicly (no auth required)
  useEffect(() => {
    if (contactId && eventTypeId) {
      setContactLoading(true);
      console.log(`[Booking Page] Fetching contact data for leadId: ${contactId}, eventTypeId: ${eventTypeId}`);
      apiClient.get(`/calendar/booking/contact/${contactId}`, {
        params: { eventTypeId },
      })
        .then((response) => {
          const contactData = response.data;
          console.log(`[Booking Page] Contact data received:`, {
            hasData: !!contactData,
            id: contactData?.id,
            firstName: contactData?.firstName,
            email: contactData?.email,
          });
          
          // Check if response.data exists and is not null
          if (contactData && contactData !== null && typeof contactData === 'object') {
            // Check if we have at least some contact information
            if (contactData.id || contactData.firstName || contactData.email) {
              console.log(`[Booking Page] Setting contact data:`, {
                id: contactData.id,
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                email: contactData.email,
                phone: contactData.phone || contactData.phoneNumber,
                phoneNumber: contactData.phoneNumber || contactData.phone,
              });
              setContact(contactData);
            } else {
              console.warn(`[Booking Page] Contact data exists but has no usable fields`);
              setContact(null);
            }
          } else {
            console.warn(`[Booking Page] Contact data is null or invalid`);
            setContact(null);
          }
        })
        .catch((error) => {
          // Contact not found or error - allow booking to continue
          console.error(`[Booking Page] Failed to load contact (leadId: ${contactId}, eventTypeId: ${eventTypeId}):`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
          });
          setContact(null);
        })
        .finally(() => {
          setContactLoading(false);
        });
    } else {
      // Reset contact if contactId is cleared
      console.log(`[Booking Page] No contactId or eventTypeId, clearing contact data`);
      setContact(null);
      setContactLoading(false);
    }
  }, [contactId, eventTypeId]);

  // Detect browser timezone
  const browserTimezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Pre-fill form data from contact if available
  const [formData, setFormData] = useState({
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    attendeeCompany: '',
  });
  
  // Update form data when contact is loaded
  useEffect(() => {
    if (contact && contactId) {
      const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '';
      const email = contact.email || '';
      const phone = contact.phone || contact.phoneNumber || contact.attributes?.phone || '';
      const company = contact.attributes?.company || '';
      
      console.log(`[Booking Page] Pre-filling form with contact data:`, { 
        name, 
        email, 
        phone, 
        company,
        contactId: contact?.id,
        firstName: contact?.firstName,
        lastName: contact?.lastName,
      });
      
      // Only update if we have meaningful data
      if (name || email || phone) {
        setFormData({
          attendeeName: name,
          attendeeEmail: email,
          attendeePhone: phone,
          attendeeCompany: company,
        });
        console.log(`[Booking Page] Form data updated successfully`);
      } else {
        console.warn(`[Booking Page] Contact data exists but no usable fields found`);
      }
    } else if (!contactId) {
      // Clear form if no contactId
      console.log(`[Booking Page] No contactId, clearing form data`);
      setFormData({
        attendeeName: '',
        attendeeEmail: '',
        attendeePhone: '',
        attendeeCompany: '',
      });
    }
  }, [contact, contactId]);
  
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Calculate date range for available slots (next 30 days)
  const dateRange = useMemo(() => {
    const start = new Date();
    const end = addDays(start, 30);
    return { start, end };
  }, []);

  // Get available slots - need to get assignedToUserId from availability
  const assignedToUserId = bookingData?.availabilities?.[0]?.assignedToUserId;
  // Use contact timezone if available, otherwise browser timezone
  const requestTimezone = contact?.timezone || browserTimezone;
  const { data: availableSlots = [] } = useAvailableBookingSlots(
    eventTypeId,
    dateRange.start,
    dateRange.end,
    assignedToUserId,
    requestTimezone, // Pass contact or browser timezone to backend
  );

  // Get available times for selected date (formatted with AM/PM)
  const availableTimes = useMemo(() => {
    if (!selectedDate || !availableSlots.length) {
      // Debug logging
      if (!selectedDate) {
        console.log('[Booking] No selectedDate');
      }
      if (!availableSlots.length) {
        console.log('[Booking] No availableSlots returned from API', { 
          availableSlotsLength: availableSlots.length,
          eventTypeId,
          dateRange: { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() },
          assignedToUserId 
        });
      }
      return [];
    }
    
    // Convert selectedDate to UTC start of day for comparison
    // This ensures we match slots regardless of timezone
    const selectedDateUTC = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      0, 0, 0, 0
    ));
    
    const times = availableSlots
      .filter((slot) => {
        const slotDate = new Date(slot);
        const slotDateUTC = new Date(Date.UTC(
          slotDate.getUTCFullYear(),
          slotDate.getUTCMonth(),
          slotDate.getUTCDate(),
          0, 0, 0, 0
        ));
        const matches = slotDateUTC.getTime() === selectedDateUTC.getTime();
        if (!matches && availableSlots.length > 0) {
          console.log('[Booking] Slot date mismatch', {
            slot: slotDate.toISOString(),
            slotDateUTC: slotDateUTC.toISOString(),
            selectedDate: selectedDate.toISOString(),
            selectedDateUTC: selectedDateUTC.toISOString(),
          });
        }
        return matches;
      })
      .map((slot) => {
        const slotDate = new Date(slot);
        return {
          time: formatInLeadTimezone(slotDate, 'h:mm a', contact?.timezone || contact?.attributes?.timezone), // AM/PM format in contact timezone
          iso: slotDate.toISOString(), // Convert to ISO string for React key
          date: slotDate,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (times.length === 0 && availableSlots.length > 0) {
      console.log('[Booking] No times matched selected date', {
        selectedDate: selectedDate.toISOString(),
        selectedDateUTC: selectedDateUTC.toISOString(),
        availableSlotsCount: availableSlots.length,
        firstSlot: availableSlots[0] ? new Date(availableSlots[0]).toISOString() : null,
      });
    }
    
    return times;
  }, [selectedDate, availableSlots, contact?.timezone, contact?.attributes?.timezone, eventTypeId, dateRange, assignedToUserId]);

  // Auto-select earliest available slot when slots are loaded
  useEffect(() => {
    if (availableSlots.length > 0 && !selectedTime && availableTimes.length > 0) {
      // Find the earliest slot that is today or in the future
      const now = new Date();
      const futureSlots = availableSlots
        .map(slot => new Date(slot))
        .filter(slot => slot >= now)
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (futureSlots.length > 0) {
        const earliestSlot = futureSlots[0];
        // Set the date to the earliest slot's date
        setSelectedDate(earliestSlot);
        // Find the matching time slot from availableTimes
        const matchingTimeSlot = availableTimes.find(t => 
          isSameDay(t.date, earliestSlot) && 
          Math.abs(t.date.getTime() - earliestSlot.getTime()) < 60000 // Within 1 minute
        );
        if (matchingTimeSlot) {
          setSelectedTime(matchingTimeSlot.time);
        } else {
          // Fallback: format the time directly
          const timeStr = format(earliestSlot, 'h:mm a');
          setSelectedTime(timeStr);
        }
      }
    }
  }, [availableSlots, selectedTime, availableTimes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast.error('Please select a date and time');
      return;
    }

    // If contactId/leadId is provided, use contact data (pre-filled)
    // Otherwise, validate required fields from form
    let finalName = '';
    let finalEmail = '';
    let finalPhone = '';
    let finalCompany = '';
    
    if (contact && contactId) {
      // Use contact data (pre-filled, read-only)
      finalName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '';
      finalEmail = contact.email || '';
      finalPhone = contact.phone || contact.phoneNumber || '';
      finalCompany = contact.attributes?.company || '';
      
      if (!finalName || !finalEmail) {
        toast.error('Contact information is incomplete. Please contact support.');
        return;
      }
    } else {
      // Use form data (user entered)
      finalName = formData.attendeeName || '';
      finalEmail = formData.attendeeEmail || '';
      finalPhone = formData.attendeePhone || '';
      finalCompany = formData.attendeeCompany || '';
      
      if (!finalName || !finalEmail) {
        toast.error('Please fill in all required fields');
        return;
      }
    }

    try {
      // Find the matching slot from availableTimes to get the exact ISO time
      const matchingSlot = availableTimes.find(t => t.time === selectedTime);
      if (!matchingSlot) {
        toast.error('Selected time slot is no longer available. Please select another time.');
        return;
      }

      const startTime = matchingSlot.date; // This is already a Date object
      const durationMinutes = bookingData?.eventType.durationMinutes || 30;
      const endTime = addMinutes(startTime, durationMinutes);

      await createBooking.mutateAsync({
        eventTypeId,
        contactId: contactId || undefined, // Use leadId as contactId
        leadId: leadId, // Pass leadId for tracking
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendeeName: finalName,
        attendeeEmail: finalEmail,
        attendeePhone: finalPhone || undefined,
        attendeeCompany: finalCompany || undefined,
        timezone: contact?.timezone || browserTimezone, // Use contact timezone if available, otherwise browser timezone
        tenantId: bookingData?.eventType?.tenantId || '', // Optional - backend will use eventType's tenantId
      });

      setBookingSuccess(true);
      toast.success('Event scheduled successfully!');
    } catch (error: any) {
      // Ensure error message is always a string
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to schedule event';
      const errorString = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
      toast.error(errorString);
      console.error('[Booking Page] Failed to schedule event:', error);
    }
  };

  if (isLoading || contactLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Event type not found or inactive</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-4">
              Your event has been scheduled for {selectedDate && formatInLeadTimezone(selectedDate, 'MMMM d, yyyy', contact?.timezone || contact?.attributes?.timezone)} at {selectedTime} ({contact?.timezone || contact?.attributes?.timezone || browserTimezone})
            </p>
            <p className="text-sm text-muted-foreground">
              You will receive a confirmation email shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{bookingData.eventType.name}</CardTitle>
            {bookingData.eventType.description && (
              <CardDescription>{bookingData.eventType.description}</CardDescription>
            )}
            {bookingData.eventType.durationMinutes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Clock className="h-4 w-4" />
                <span>{bookingData.eventType.durationMinutes} minutes</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Selection */}
              <div>
                <Label className="mb-2 block">Select Date</Label>
                <div className="border rounded-md p-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                  />
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                  <Label className="mb-2 block">Select Time</Label>
                  {availableTimes.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {availableTimes.map((timeSlot) => (
                        <Button
                          key={timeSlot.iso}
                          type="button"
                          variant={selectedTime === timeSlot.time ? 'default' : 'outline'}
                          onClick={() => setSelectedTime(timeSlot.time)}
                        >
                          {timeSlot.time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No available times for this date. Please select another date.
                    </p>
                  )}
                </div>
              )}

              {/* Contact Information */}
              <div className="space-y-4">
                {contactId ? (
                  contactLoading ? (
                    <div className="text-sm text-muted-foreground">Loading your information...</div>
                  ) : contact ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">Your information has been pre-filled from our records.</p>
                      <div>
                        <Label htmlFor="attendeeName">Name *</Label>
                        <Input
                          id="attendeeName"
                          value={formData.attendeeName}
                          readOnly
                          className="bg-gray-50 cursor-not-allowed"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="attendeeEmail">Email *</Label>
                        <Input
                          id="attendeeEmail"
                          type="email"
                          value={formData.attendeeEmail}
                          readOnly
                          className="bg-gray-50 cursor-not-allowed"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="attendeePhone">Phone</Label>
                        <Input
                          id="attendeePhone"
                          type="tel"
                          value={formData.attendeePhone}
                          readOnly
                          className="bg-gray-50 cursor-not-allowed"
                        />
                      </div>
                      {formData.attendeeCompany && (
                        <div>
                          <Label htmlFor="attendeeCompany">Company</Label>
                          <Input
                            id="attendeeCompany"
                            value={formData.attendeeCompany}
                            readOnly
                            className="bg-gray-50 cursor-not-allowed"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">Please provide your information to complete the booking.</p>
                      <div>
                        <Label htmlFor="attendeeName">Name *</Label>
                        <Input
                          id="attendeeName"
                          value={formData.attendeeName}
                          onChange={(e) => setFormData({ ...formData, attendeeName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="attendeeEmail">Email *</Label>
                        <Input
                          id="attendeeEmail"
                          type="email"
                          value={formData.attendeeEmail}
                          onChange={(e) => setFormData({ ...formData, attendeeEmail: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="attendeePhone">Phone</Label>
                        <Input
                          id="attendeePhone"
                          type="tel"
                          value={formData.attendeePhone}
                          onChange={(e) => setFormData({ ...formData, attendeePhone: e.target.value })}
                        />
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <div>
                      <Label htmlFor="attendeeName">Name *</Label>
                      <Input
                        id="attendeeName"
                        value={formData.attendeeName}
                        onChange={(e) => setFormData({ ...formData, attendeeName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="attendeeEmail">Email *</Label>
                      <Input
                        id="attendeeEmail"
                        type="email"
                        value={formData.attendeeEmail}
                        onChange={(e) => setFormData({ ...formData, attendeeEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="attendeePhone">Phone</Label>
                      <Input
                        id="attendeePhone"
                        type="tel"
                        value={formData.attendeePhone}
                        onChange={(e) => setFormData({ ...formData, attendeePhone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="attendeeCompany">Company</Label>
                      <Input
                        id="attendeeCompany"
                        value={formData.attendeeCompany}
                        onChange={(e) => setFormData({ ...formData, attendeeCompany: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={createBooking.isPending}>
                {createBooking.isPending ? 'Scheduling...' : 'Schedule Event'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

