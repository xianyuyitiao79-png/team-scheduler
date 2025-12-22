import { format, startOfDay, getDay } from 'date-fns';

// Data Structures requested by the user
export interface ShiftTemplateInput {
  id: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  appliesToDays: number[]; // 0-6 (Sun-Sat) or 1-7 (Mon-Sun)? date-fns getDay returns 0 for Sunday. Let's assume 0=Sun.
  active: boolean;
}

export interface ScheduledShiftInput {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startDateTime: Date;
  endDateTime: Date;
  type?: string;
  status?: string;
}

export interface WeekRange {
  start: Date;
  end: Date;
}

export interface OpenShiftItem {
  templateId: string;
  templateName: string;
  templateStartTime: string; // HH:mm
  templateEndTime: string;   // HH:mm
  startDateTime: Date;
  endDateTime: Date;
  minutes: number;
  coveredBy: string[]; // userIds
}

export interface OpenShiftDay {
  date: string; // YYYY-MM-DD
  items: OpenShiftItem[];
}

// Helper to convert time string (HH:MM) to minutes from midnight
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper to convert minutes from midnight to Date object for a specific day
function minutesToDate(minutes: number, baseDate: Date): Date {
  const date = startOfDay(baseDate);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  date.setHours(hours, mins, 0, 0);
  return date;
}

export function computeOpenShifts(
  templates: ShiftTemplateInput[],
  scheduledShifts: ScheduledShiftInput[],
  weekRange: WeekRange
): OpenShiftDay[] {
  const result: OpenShiftDay[] = [];
  const currentDate = new Date(weekRange.start);
  
  // Iterate through each day in the week range
  while (currentDate <= weekRange.end) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayOfWeek = getDay(currentDate); // 0 = Sunday
    
    const dayItems: OpenShiftItem[] = [];

    // Filter templates active for this day
    const activeTemplates = templates.filter(t => 
      t.active && t.appliesToDays.includes(dayOfWeek)
    );

    for (const template of activeTemplates) {
      const tStartMins = timeToMinutes(template.startTime);
      const tEndMins = timeToMinutes(template.endTime);
      
      // Handle cross-midnight templates (e.g. 22:00 - 02:00)? 
      // User examples don't show this. Assuming standard day shifts for simplicity first.
      // If tEndMins < tStartMins, it ends next day. We'll handle strictly within the day for now as per "daily" requirement.
      if (tEndMins < tStartMins) continue; 

      // Find overlapping shifts for this day
      // We convert shifts to minutes-from-midnight relative to THIS day
      const coveringIntervals: { start: number; end: number }[] = [];

      for (const shift of scheduledShifts) {
        // Check if shift belongs to this date (conceptually)
        // A shift might start on previous day and end today, or start today.
        // For simplicity, we look at intersections with the Template Time Window on This Date.
        
        const shiftStart = shift.startDateTime;
        const shiftEnd = shift.endDateTime;

        const templateStartDateTime = minutesToDate(tStartMins, currentDate);
        const templateEndDateTime = minutesToDate(tEndMins, currentDate);

        // Check overlap
        if (shiftEnd <= templateStartDateTime || shiftStart >= templateEndDateTime) {
          continue;
        }

        // Calculate intersection minutes
        // We need to clamp the shift time to the template day/time
        const clampStart = shiftStart < templateStartDateTime ? templateStartDateTime : shiftStart;
        const clampEnd = shiftEnd > templateEndDateTime ? templateEndDateTime : shiftEnd;

        // Convert clamped times to minutes from midnight
        const startMins = clampStart.getHours() * 60 + clampStart.getMinutes();
        const endMins = clampEnd.getHours() * 60 + clampEnd.getMinutes();
        
        if (endMins > startMins) {
            coveringIntervals.push({ start: startMins, end: endMins });
        }
      }

      // Merge overlapping intervals
      coveringIntervals.sort((a, b) => a.start - b.start);
      
      const merged: { start: number; end: number }[] = [];
      if (coveringIntervals.length > 0) {
        let current = coveringIntervals[0];
        for (let i = 1; i < coveringIntervals.length; i++) {
          const next = coveringIntervals[i];
          if (next.start <= current.end) {
            // Overlap or adjacent
            current.end = Math.max(current.end, next.end);
          } else {
            merged.push(current);
            current = next;
          }
        }
        merged.push(current);
      }

      // Calculate Gaps
      let pointer = tStartMins;
      for (const interval of merged) {
        if (interval.start > pointer) {
          // Found a gap
          dayItems.push({
            templateId: template.id,
            templateName: template.name,
            templateStartTime: template.startTime,
            templateEndTime: template.endTime,
            startDateTime: minutesToDate(pointer, currentDate),
            endDateTime: minutesToDate(interval.start, currentDate),
            minutes: interval.start - pointer,
            coveredBy: [] // Empty means open
          });
        }
        pointer = Math.max(pointer, interval.end);
      }

      // Check final gap after last interval
      if (pointer < tEndMins) {
        dayItems.push({
          templateId: template.id,
          templateName: template.name,
          templateStartTime: template.startTime,
          templateEndTime: template.endTime,
          startDateTime: minutesToDate(pointer, currentDate),
          endDateTime: minutesToDate(tEndMins, currentDate),
          minutes: tEndMins - pointer,
          coveredBy: []
        });
      }
    }

    if (dayItems.length > 0) {
      // Sort by start time
      dayItems.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
      result.push({
        date: dateStr,
        items: dayItems
      });
    }

    // Next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}
