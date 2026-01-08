import { JourneyTemplate, TemplateCategory } from '../entities/journey-template.entity';
import { addDayMetadataToAllNodes } from './add-all-day-metadata';

/**
 * Creates a 5-day lead nurture journey template
 * - 2-3 calls per day
 * - 1 SMS per day
 */
export function create5DayLeadJourneyTemplate(): Partial<JourneyTemplate> {
  const nodeId1 = 'node-1'; // Start
  const nodeId2 = 'node-2'; // Day 1 - Call 1
  const nodeId3 = 'node-3'; // Day 1 - SMS
  const nodeId4 = 'node-4'; // Day 1 - Call 2
  const nodeId5 = 'node-5'; // Day 2 - Delay
  const nodeId6 = 'node-6'; // Day 2 - Call 1
  const nodeId7 = 'node-7'; // Day 2 - SMS
  const nodeId8 = 'node-8'; // Day 2 - Call 2
  const nodeId9 = 'node-9'; // Day 3 - Delay
  const nodeId10 = 'node-10'; // Day 3 - Call 1
  const nodeId11 = 'node-11'; // Day 3 - SMS
  const nodeId12 = 'node-12'; // Day 3 - Call 2
  const nodeId13 = 'node-13'; // Day 4 - Delay
  const nodeId14 = 'node-14'; // Day 4 - Call 1
  const nodeId15 = 'node-15'; // Day 4 - SMS
  const nodeId16 = 'node-16'; // Day 4 - Call 2
  const nodeId17 = 'node-17'; // Day 5 - Delay
  const nodeId18 = 'node-18'; // Day 5 - Call 1
  const nodeId19 = 'node-19'; // Day 5 - SMS
  const nodeId20 = 'node-20'; // Day 5 - Call 2
  const nodeId21 = 'node-21'; // Day 5 - Call 3

  return {
    name: '5-Day Lead Nurture Journey',
    description: 'Intensive 5-day lead nurture sequence with 2-3 calls and 1 SMS per day. Perfect for high-value leads that need immediate attention.',
    category: TemplateCategory.LEAD_NURTURE,
    isPublic: true,
    journeyData: {
      name: '5-Day Lead Nurture Journey',
      description: 'Intensive 5-day lead nurture sequence with 2-3 calls and 1 SMS per day',
      autoEnrollEnabled: false,
      entryCriteria: {},
      scheduleConfig: {
        enabled: true,
        timezone: 'America/New_York',
        allowedDays: [1, 2, 3, 4, 5], // Monday-Friday
        allowedHours: { start: 9, end: 18 }, // 9 AM - 6 PM
      },
      nodes: addDayMetadataToAllNodes([
        // Day 1 - Morning Call (9 AM)
        {
          id: nodeId2,
          type: 'MAKE_CALL',
          positionX: 200,
          positionY: 100,
          config: {
            voiceTemplateId: null, // Configure with your voice template
            enableVmFile: true,
            recordCall: true,
            day: 1, // Day marker
          },
          metadata: { day: 1 },
          connections: { nextNodeId: nodeId3 },
        },
        // Day 1 - SMS (11 AM - 2 hours after call)
        {
          id: nodeId3,
          type: 'TIME_DELAY',
          positionX: 200,
          positionY: 200,
          config: {
            delayValue: 2,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'sms-1' },
        },
        {
          id: 'sms-1',
          type: 'SEND_SMS',
          positionX: 200,
          positionY: 300,
          config: {
            messageContent: 'Hi {{firstName}}, thanks for your interest! We\'d love to connect and show you how we can help. Reply STOP to opt out.',
          },
          connections: { nextNodeId: nodeId4 },
        },
        // Day 1 - Afternoon Call (2 PM)
        {
          id: nodeId4,
          type: 'TIME_DELAY',
          positionX: 200,
          positionY: 400,
          config: {
            delayValue: 3,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'call-1-2' },
        },
        {
          id: 'call-1-2',
          type: 'MAKE_CALL',
          positionX: 200,
          positionY: 500,
          config: {
            voiceTemplateId: null,
            enableVmFile: true,
            recordCall: true,
          },
          connections: { nextNodeId: nodeId5 },
        },
        // Day 2 - Delay (1 day)
        {
          id: nodeId5,
          type: 'TIME_DELAY',
          positionX: 400,
          positionY: 100,
          config: {
            delayValue: 1,
            delayUnit: 'DAYS',
          },
          connections: { nextNodeId: nodeId6 },
        },
        // Day 2 - Morning Call
        {
          id: nodeId6,
          type: 'MAKE_CALL',
          positionX: 400,
          positionY: 200,
          config: {
            voiceTemplateId: null,
            enableVmFile: true,
            recordCall: true,
          },
          connections: { nextNodeId: nodeId7 },
        },
        // Day 2 - SMS
        {
          id: nodeId7,
          type: 'TIME_DELAY',
          positionX: 400,
          positionY: 300,
          config: {
            delayValue: 2,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'sms-2' },
        },
        {
          id: 'sms-2',
          type: 'SEND_SMS',
          positionX: 400,
          positionY: 400,
          config: {
            messageContent: 'Hi {{firstName}}, following up on our conversation. We have some exciting updates that might interest you!',
          },
          connections: { nextNodeId: nodeId8 },
        },
        // Day 2 - Afternoon Call
        {
          id: nodeId8,
          type: 'TIME_DELAY',
          positionX: 400,
          positionY: 500,
          config: {
            delayValue: 3,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'call-2-2' },
        },
        {
          id: 'call-2-2',
          type: 'MAKE_CALL',
          positionX: 400,
          positionY: 600,
          config: {
            voiceTemplateId: null,
            enableVmFile: true,
            recordCall: true,
          },
          connections: { nextNodeId: nodeId9 },
        },
        // Day 3 - Delay (1 day)
        {
          id: nodeId9,
          type: 'TIME_DELAY',
          positionX: 600,
          positionY: 100,
          config: {
            delayValue: 1,
            delayUnit: 'DAYS',
          },
          connections: { nextNodeId: nodeId10 },
        },
        // Day 3 - Morning Call
        {
          id: nodeId10,
          type: 'MAKE_CALL',
          positionX: 600,
          positionY: 200,
          config: {
            voiceTemplateId: null,
            enableVmFile: true,
            recordCall: true,
          },
          connections: { nextNodeId: nodeId11 },
        },
        // Day 3 - SMS
        {
          id: nodeId11,
          type: 'TIME_DELAY',
          positionX: 600,
          positionY: 300,
          config: {
            delayValue: 2,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'sms-3' },
        },
        {
          id: 'sms-3',
          type: 'SEND_SMS',
          positionX: 600,
          positionY: 400,
          config: {
            messageContent: '{{firstName}}, we\'re here to answer any questions you might have. What would you like to know more about?',
          },
          connections: { nextNodeId: nodeId12 },
        },
        // Day 3 - Afternoon Call
        {
          id: nodeId12,
          type: 'TIME_DELAY',
          positionX: 600,
          positionY: 500,
          config: {
            delayValue: 3,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'call-3-2' },
        },
        {
          id: 'call-3-2',
          type: 'MAKE_CALL',
          positionX: 600,
          positionY: 600,
          config: {
            voiceTemplateId: null,
            enableVmFile: true,
            recordCall: true,
          },
          connections: { nextNodeId: nodeId13 },
        },
        // Day 4 - Delay
        {
          id: nodeId13,
          type: 'TIME_DELAY',
          positionX: 800,
          positionY: 100,
          config: {
            delayValue: 1,
            delayUnit: 'DAYS',
          },
          connections: { nextNodeId: nodeId14 },
        },
        // Day 4 - Morning Call
        {
          id: nodeId14,
          type: 'MAKE_CALL',
          positionX: 800,
          positionY: 200,
          config: {
            voiceTemplateId: null,
            enableVmFile: true,
            recordCall: true,
          },
          connections: { nextNodeId: nodeId15 },
        },
        // Day 4 - SMS
        {
          id: nodeId15,
          type: 'TIME_DELAY',
          positionX: 800,
          positionY: 300,
          config: {
            delayValue: 2,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'sms-4' },
        },
        {
          id: 'sms-4',
          type: 'SEND_SMS',
          positionX: 800,
          positionY: 400,
          config: {
            messageContent: 'Hi {{firstName}}, we have a special offer that expires soon. Let\'s schedule a quick call to discuss!',
          },
          connections: { nextNodeId: nodeId16 },
        },
        // Day 4 - Afternoon Call
        {
          id: nodeId16,
          type: 'TIME_DELAY',
          positionX: 800,
          positionY: 500,
          config: {
            delayValue: 3,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'call-4-2' },
        },
        {
          id: 'call-4-2',
          type: 'MAKE_CALL',
          positionX: 800,
          positionY: 600,
          config: {
            voiceTemplateId: null,
            enableVmFile: true,
            recordCall: true,
          },
          connections: { nextNodeId: nodeId17 },
        },
        // Day 5 - Delay
        {
          id: nodeId17,
          type: 'TIME_DELAY',
          positionX: 1000,
          positionY: 100,
          config: {
            delayValue: 1,
            delayUnit: 'DAYS',
          },
          connections: { nextNodeId: nodeId18 },
        },
        // Day 5 - Morning Call
        {
          id: nodeId18,
          type: 'MAKE_CALL',
          positionX: 1000,
          positionY: 200,
          config: {
            voiceTemplateId: null,
            enableVmFile: true,
            recordCall: true,
          },
          connections: { nextNodeId: nodeId19 },
        },
        // Day 5 - SMS
        {
          id: nodeId19,
          type: 'TIME_DELAY',
          positionX: 1000,
          positionY: 300,
          config: {
            delayValue: 2,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'sms-5' },
        },
        {
          id: 'sms-5',
          type: 'SEND_SMS',
          positionX: 1000,
          positionY: 400,
          config: {
            messageContent: '{{firstName}}, this is our final follow-up. We\'d love to hear from you. Reply YES to schedule a call or STOP to opt out.',
          },
          connections: { nextNodeId: nodeId20 },
        },
        // Day 5 - Afternoon Call
        {
          id: nodeId20,
          type: 'TIME_DELAY',
          positionX: 1000,
          positionY: 500,
          config: {
            delayValue: 3,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'call-5-2' },
        },
        {
          id: 'call-5-2',
          type: 'MAKE_CALL',
          positionX: 1000,
          positionY: 600,
          config: {
            voiceTemplateId: null,
            enableVmFile: true,
            recordCall: true,
          },
          connections: { nextNodeId: nodeId21 },
        },
        // Day 5 - Final Call (Evening)
        {
          id: nodeId21,
          type: 'TIME_DELAY',
          positionX: 1000,
          positionY: 700,
          config: {
            delayValue: 4,
            delayUnit: 'HOURS',
          },
          connections: { nextNodeId: 'call-5-3' },
        },
        {
          id: 'call-5-3',
          type: 'MAKE_CALL',
          positionX: 1000,
          positionY: 800,
          config: {
            voiceTemplateId: null,
            enableVmFile: true,
            recordCall: true,
          },
          connections: {},
        },
      ]),
    },
    metadata: {
      estimatedDuration: '5 days',
      useCase: 'High-value lead nurturing with intensive follow-up',
      tags: ['lead-nurture', 'calls', 'sms', '5-day', 'intensive'],
    },
  };
}

