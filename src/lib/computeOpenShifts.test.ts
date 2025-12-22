import { describe, it, expect } from 'vitest';
import { computeOpenShifts, ShiftTemplateInput, ScheduledShiftInput, WeekRange } from './computeOpenShifts';
import { parseISO } from 'date-fns';

describe('computeOpenShifts', () => {
  const templates: ShiftTemplateInput[] = [
    {
      id: 't1',
      name: 'Morning',
      startTime: '09:00',
      endTime: '13:00',
      appliesToDays: [0, 1, 2, 3, 4, 5, 6], // All days
      active: true
    },
    {
      id: 't2',
      name: 'Afternoon',
      startTime: '13:00',
      endTime: '17:00',
      appliesToDays: [1], // Monday only
      active: true
    }
  ];

  const weekRange: WeekRange = {
    start: parseISO('2025-12-22'), // Monday
    end: parseISO('2025-12-22')  // Monday
  };

  it('should return full template ranges when no shifts exist', () => {
    const shifts: ScheduledShiftInput[] = [];
    const result = computeOpenShifts(templates, shifts, weekRange);

    expect(result).toHaveLength(1); // One day
    expect(result[0].items).toHaveLength(2); // Morning and Afternoon

    // Morning Gap
    expect(result[0].items[0].templateName).toBe('Morning');
    expect(result[0].items[0].minutes).toBe(240); // 4 hours

    // Afternoon Gap
    expect(result[0].items[1].templateName).toBe('Afternoon');
    expect(result[0].items[1].minutes).toBe(240);
  });

  it('should return no items if fully covered', () => {
    const shifts: ScheduledShiftInput[] = [
      {
        id: 's1',
        userId: 'u1',
        date: '2025-12-22',
        startDateTime: parseISO('2025-12-22T09:00:00'),
        endDateTime: parseISO('2025-12-22T13:00:00'),
      },
      {
        id: 's2',
        userId: 'u2',
        date: '2025-12-22',
        startDateTime: parseISO('2025-12-22T13:00:00'),
        endDateTime: parseISO('2025-12-22T17:00:00'),
      }
    ];

    const result = computeOpenShifts(templates, shifts, weekRange);
    expect(result).toHaveLength(0); // No gaps
  });

  it('should calculate partial gaps', () => {
    const shifts: ScheduledShiftInput[] = [
      {
        id: 's1',
        userId: 'u1',
        date: '2025-12-22',
        startDateTime: parseISO('2025-12-22T10:00:00'), // Starts 1 hour late
        endDateTime: parseISO('2025-12-22T12:00:00'), // Ends 1 hour early
      }
    ];

    // Testing only Morning template for clarity, let's filter input or just assert
    const result = computeOpenShifts([templates[0]], shifts, weekRange);

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2); // Gap before and Gap after

    // Gap 1: 09:00 - 10:00
    expect(result[0].items[0].startDateTime.getHours()).toBe(9);
    expect(result[0].items[0].endDateTime.getHours()).toBe(10);
    expect(result[0].items[0].minutes).toBe(60);

    // Gap 2: 12:00 - 13:00
    expect(result[0].items[1].startDateTime.getHours()).toBe(12);
    expect(result[0].items[1].endDateTime.getHours()).toBe(13);
    expect(result[0].items[1].minutes).toBe(60);
  });

  it('should merge overlapping shifts from different users', () => {
    const shifts: ScheduledShiftInput[] = [
      {
        id: 's1',
        userId: 'u1',
        date: '2025-12-22',
        startDateTime: parseISO('2025-12-22T09:00:00'),
        endDateTime: parseISO('2025-12-22T11:00:00'),
      },
      {
        id: 's2',
        userId: 'u2', // Different user
        date: '2025-12-22',
        startDateTime: parseISO('2025-12-22T10:00:00'), // Overlaps
        endDateTime: parseISO('2025-12-22T12:00:00'),
      }
    ];
    // Combined coverage: 09:00 - 12:00. Gap: 12:00 - 13:00.

    const result = computeOpenShifts([templates[0]], shifts, weekRange);

    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].startDateTime.getHours()).toBe(12);
    expect(result[0].items[0].endDateTime.getHours()).toBe(13);
  });

  it('should handle custom shifts that extend beyond template', () => {
    const shifts: ScheduledShiftInput[] = [
      {
        id: 's1',
        userId: 'u1',
        date: '2025-12-22',
        startDateTime: parseISO('2025-12-22T08:00:00'), // Starts early
        endDateTime: parseISO('2025-12-22T14:00:00'), // Ends late
      }
    ];
    // Template 09:00-13:00 is fully covered.

    const result = computeOpenShifts([templates[0]], shifts, weekRange);
    expect(result).toHaveLength(0);
  });
});
