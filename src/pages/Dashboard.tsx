import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { supabase } from '../lib/supabase';
import { Shift } from '../types';
import { format, parseISO, addDays, eachDayOfInterval } from 'date-fns';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';

interface OperatingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
}

interface SpecialOperatingHour {
  specific_date: string;
  start_time: string;
  end_time: string;
  is_closed: boolean;
}

interface OpenSlot {
  date: Date;
  slots: { start: string; end: string }[];
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!profile) return;
      
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const nextWeek = addDays(today, 7);
      const nextWeekStr = format(nextWeek, 'yyyy-MM-dd');
      const twoWeeksLater = addDays(today, 14);
      const twoWeeksLaterStr = format(twoWeeksLater, 'yyyy-MM-dd');

      // 1. Fetch Upcoming Shifts (Next 7 Days)
      const { data: shiftData } = await supabase
        .from('shifts')
        .select('*, shift_templates(*)')
        .eq('user_id', profile.id)
        .gte('date', todayStr)
        .lte('date', nextWeekStr)
        .eq('status', 'published')
        .order('date', { ascending: true });

      if (shiftData) {
        setUpcomingShifts(shiftData as unknown as Shift[]);
      }

      // 2. Fetch Operating Hours
      const { data: opHoursData } = await supabase
        .from('operating_hours')
        .select('*');
      
      const opHoursMap = new Map<number, OperatingHour>();
      if (opHoursData) {
        opHoursData.forEach((h: OperatingHour) => opHoursMap.set(h.day_of_week, h));
      }

      // 2b. Fetch Special Operating Hours
      const { data: specialHoursData } = await supabase
        .from('special_operating_hours')
        .select('*')
        .gte('specific_date', todayStr)
        .lte('specific_date', twoWeeksLaterStr);

      const specialHoursMap = new Map<string, SpecialOperatingHour>();
      if (specialHoursData) {
        specialHoursData.forEach((h: SpecialOperatingHour) => specialHoursMap.set(h.specific_date, h));
      }

      // 3. Fetch All Shifts for next 2 weeks to calculate open slots
      const { data: allShiftsData } = await supabase
        .from('shifts')
        .select('date, start_time, end_time, shift_templates(start_time, end_time)')
        .gte('date', todayStr)
        .lte('date', twoWeeksLaterStr);

      const allShifts = (allShiftsData || []) as unknown as Shift[];

      // 4. Calculate Open Slots
      const days = eachDayOfInterval({ start: today, end: twoWeeksLater });
      const computedOpenSlots: OpenSlot[] = [];

      days.forEach(day => {
        const dayOfWeek = day.getDay();
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Determine effective operating hours
        let startStr = '10:00';
        let endStr = '18:00';
        let isClosed = false;

        const specialHour = specialHoursMap.get(dateStr);
        const opHour = opHoursMap.get(dayOfWeek);

        if (specialHour) {
            startStr = specialHour.start_time;
            endStr = specialHour.end_time;
            isClosed = specialHour.is_closed;
        } else if (opHour) {
            startStr = opHour.start_time;
            endStr = opHour.end_time;
            isClosed = opHour.is_closed;
        }

        if (isClosed) return;

        // Get shifts for this day
        const dayShifts = allShifts.filter(s => s.date === dateStr);
        
        // Simple logic: If NO shifts cover the operating hours, it's fully open.
        // If there are shifts, we need to subtract them from the operating range.
        // For simplicity in this version (as per user request style), we just check occupied vs total range.
        // A more complex interval subtraction algorithm:
        
        const storeStart = parseInt(startStr.split(':')[0]) * 60 + parseInt(startStr.split(':')[1]);
        const storeEnd = parseInt(endStr.split(':')[0]) * 60 + parseInt(endStr.split(':')[1]);
        
        // Flatten shifts into occupied intervals
        let occupied = dayShifts.map(s => {
            const startStr = s.start_time || s.shift_templates?.start_time;
            const endStr = s.end_time || s.shift_templates?.end_time;
            if (!startStr || !endStr) return null;
            
            return {
                start: parseInt(startStr.split(':')[0]) * 60 + parseInt(startStr.split(':')[1]),
                end: parseInt(endStr.split(':')[0]) * 60 + parseInt(endStr.split(':')[1])
            };
        }).filter(Boolean) as {start: number, end: number}[];

        occupied.sort((a, b) => a.start - b.start);

        // Merge overlapping occupied intervals
        const mergedOccupied: {start: number, end: number}[] = [];
        for (const interval of occupied) {
            if (mergedOccupied.length === 0) {
                mergedOccupied.push(interval);
            } else {
                const last = mergedOccupied[mergedOccupied.length - 1];
                if (interval.start < last.end) {
                    last.end = Math.max(last.end, interval.end);
                } else {
                    mergedOccupied.push(interval);
                }
            }
        }

        // Invert occupied to find free slots within store hours
        const freeSlots: {start: number, end: number}[] = [];
        let current = storeStart;

        for (const occ of mergedOccupied) {
            // Ensure we don't go beyond storeEnd
            const nextOccupiedStart = Math.min(occ.start, storeEnd);
            
            if (current < nextOccupiedStart) {
                freeSlots.push({ start: current, end: nextOccupiedStart });
            }
            current = Math.max(current, occ.end);
        }
        
        if (current < storeEnd) {
            freeSlots.push({ start: current, end: storeEnd });
        }

        // Convert back to string and filter small slots (e.g. < 30 mins)
        let validSlots = freeSlots
            .filter(slot => slot.end - slot.start >= 30)
            .map(slot => ({
                start: `${Math.floor(slot.start / 60).toString().padStart(2, '0')}:${(slot.start % 60).toString().padStart(2, '0')}`,
                end: `${Math.floor(slot.end / 60).toString().padStart(2, '0')}:${(slot.end % 60).toString().padStart(2, '0')}`
            }));
            
        // Deduplicate slots to prevent visual glitches
        validSlots = validSlots.filter((slot, index, self) =>
            index === self.findIndex((t) => (
                t.start === slot.start && t.end === slot.end
            ))
        );

        if (validSlots.length > 0) {
            computedOpenSlots.push({ date: day, slots: validSlots });
        }
      });

      setOpenSlots(computedOpenSlots);
      setLoading(false);
    }

    fetchData();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Welcome back, {profile?.name || 'Team Member'}
        </h1>
        <p className="text-zinc-500">Here's what's happening with your schedule.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Shift Card - Takes up 1 column on large screens */}
        <Link to="/schedule" className="block group h-full">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-zinc-900"></div>
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-zinc-900">Your Schedule (Next 7 Days)</h3>
                    <div className="p-2 bg-zinc-50 rounded-full group-hover:bg-zinc-100 transition-colors">
                        <CalendarDays className="text-zinc-500 group-hover:text-zinc-700" size={20} />
                    </div>
                </div>
                {loading ? (
                    <div className="animate-pulse space-y-3">
                        <div className="h-8 bg-zinc-100 rounded w-3/4"></div>
                        <div className="h-6 bg-zinc-100 rounded w-1/2"></div>
                    </div>
                ) : upcomingShifts.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {upcomingShifts.map((shift, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-50 last:border-0">
                                <div>
                                    <div className="font-bold text-zinc-900">
                                        {format(parseISO(shift.date), 'EEEE')}
                                    </div>
                                    <div className="text-xs text-zinc-500 font-medium">
                                        {format(parseISO(shift.date), 'MMM d')}
                                    </div>
                                </div>
                                <div className="text-sm font-mono text-zinc-700 bg-zinc-50 px-2 py-1 rounded">
                                    {(shift.start_time || shift.shift_templates?.start_time)?.slice(0, 5)} - {(shift.end_time || shift.shift_templates?.end_time)?.slice(0, 5)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-zinc-500 py-6">
                        <p className="font-medium">No upcoming shifts</p>
                        <p className="text-sm mt-1 text-zinc-400">You are free for the next week!</p>
                    </div>
                )}
            </div>
            <div className="mt-6 text-sm font-medium text-zinc-500 flex items-center group-hover:text-zinc-900 transition-colors">
                View Full Schedule <span className="ml-2 text-lg leading-none">&rarr;</span>
            </div>
            </div>
        </Link>

        {/* Open Shifts Section - Takes up 2 columns */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Open Shift Opportunities</h3>
                <p className="text-sm text-zinc-500">Available slots for the next 2 weeks based on store hours.</p>
              </div>
              <div className="text-xs font-medium px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">
                Next 14 Days
              </div>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse h-24 bg-zinc-50 rounded-lg"></div>)}
            </div>
          ) : openSlots.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {openSlots.map((slot, idx) => (
                    <div key={idx} className="p-4 bg-zinc-50 rounded-lg border border-zinc-100 hover:border-zinc-300 transition-colors group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="font-bold text-zinc-800 flex items-center">
                                <span className="text-lg">{format(slot.date, 'EEE')}</span>
                                <span className="mx-2 text-zinc-300">|</span>
                                <span className="text-zinc-500 font-medium">{format(slot.date, 'MMM d')}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {slot.slots.map((s, i) => (
                                <div key={i} className="text-sm px-3 py-1.5 bg-white border border-zinc-200 rounded-md text-zinc-700 font-mono shadow-sm group-hover:shadow-md transition-shadow">
                                    {s.start} - {s.end}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                <div className="p-3 bg-zinc-100 rounded-full mb-3">
                    <CalendarDays className="text-zinc-400" size={24} />
                </div>
                <p className="text-zinc-600 font-medium">No open shifts found</p>
                <p className="text-sm text-zinc-400 mt-1">The schedule is fully covered for the next 2 weeks!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
