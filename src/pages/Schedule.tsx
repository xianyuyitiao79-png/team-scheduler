import { useEffect, useState, useRef, useMemo } from 'react';
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  addWeeks, 
  subWeeks
} from 'date-fns';
import { useAuth } from '../features/auth/AuthContext';
import { supabase } from '../lib/supabase';
import { Profile, Shift, ShiftTemplate } from '../types';
import { ChevronLeft, ChevronRight, Download, Share } from 'lucide-react';
import ShiftModal from '../components/ShiftModal';
import html2canvas from 'html2canvas';

export default function Schedule() {
  const { profile } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyMyShifts, setOnlyMyShifts] = useState(false);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedShift, setSelectedShift] = useState<Shift | undefined>(undefined);

  const scheduleRef = useRef<HTMLDivElement>(null);

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, [currentWeekStart, profile]);

  const fetchData = async () => {
    setLoading(true);
    const startDate = format(currentWeekStart, 'yyyy-MM-dd');
    const endDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    // Fetch Profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (profilesData) setProfiles(profilesData as Profile[]);

    // Fetch Templates
    const { data: templatesData } = await supabase.from('shift_templates').select('*');
    if (templatesData) setTemplates(templatesData as ShiftTemplate[]);

    // Fetch Shifts
    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('*, shift_templates(*)')
      .gte('date', startDate)
      .lte('date', endDate);

    if (shiftsData) setShifts(shiftsData as unknown as Shift[]);
    setLoading(false);
  };

  const handleSaveShift = async (shiftData: Partial<Shift>) => {
    const payload = {
        template_id: shiftData.template_id,
        user_id: shiftData.user_id,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        note: shiftData.note
    };

    if (shiftData.id) {
      // Update
      const { error } = await supabase
        .from('shifts')
        .update(payload)
        .eq('id', shiftData.id);
      
      if (!error) fetchData();
    } else {
      // Create
      const { error } = await supabase
        .from('shifts')
        .insert([{
          date: shiftData.date,
          user_id: shiftData.user_id,
          template_id: shiftData.template_id,
          start_time: shiftData.start_time,
          end_time: shiftData.end_time,
          note: shiftData.note,
          status: 'draft' // Default to draft
        }]);

      if (!error) fetchData();
    }
  };

  const handleDeleteShift = async (id: string) => {
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (!error) fetchData();
  };

  const publishWeek = async () => {
    const startDate = format(currentWeekStart, 'yyyy-MM-dd');
    const endDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    // Update all drafts in range to published
    const { error } = await supabase
      .from('shifts')
      .update({ status: 'published' })
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'draft');

    if (!error) {
      alert('Schedule published successfully!');
      fetchData();
    }
  };

  const exportSchedule = async () => {
    if (!scheduleRef.current) return;
    try {
      const canvas = await html2canvas(scheduleRef.current);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `schedule-${format(currentWeekStart, 'yyyy-MM-dd')}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    }
  };


  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 9; i <= 21; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  const getShiftsForCell = (date: Date, timeStr: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const [hourStr] = timeStr.split(':');
    const slotStartHour = parseInt(hourStr, 10);
    
    return shifts.filter(shift => {
      if (shift.date !== dateStr) return false;
      if (onlyMyShifts && shift.user_id !== profile?.id) return false;

      // Parse shift times
      const startTime = shift.start_time || shift.shift_templates?.start_time;
      const endTime = shift.end_time || shift.shift_templates?.end_time;
      
      if (!startTime || !endTime) return false;

      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);

      // Convert everything to minutes from midnight for easier comparison
      const shiftStart = sH * 60 + sM;
      const shiftEnd = eH * 60 + eM;
      const slotStart = slotStartHour * 60;
      const slotEnd = (slotStartHour + 1) * 60; // 1 hour slot

      // Check overlap
      // Shift overlaps slot if: ShiftStart < SlotEnd AND ShiftEnd > SlotStart
      return shiftStart < slotEnd && shiftEnd > slotStart;
    });
  };

  if (loading) return <div>Loading schedule...</div>;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white rounded-md shadow-sm border border-zinc-200">
            <button 
              onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
              className="p-2 hover:bg-zinc-50 border-r border-zinc-200"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 font-medium text-zinc-900">
              {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </span>
            <button 
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              className="p-2 hover:bg-zinc-50 border-l border-zinc-200"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <button
            onClick={() => setOnlyMyShifts(!onlyMyShifts)}
            className={`px-3 py-2 text-sm font-medium rounded-md border ${
              onlyMyShifts 
                ? 'bg-zinc-900 text-white border-zinc-900' 
                : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
            }`}
          >
            {onlyMyShifts ? 'Show All' : 'My Shifts'}
          </button>
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-2">
            <button
              onClick={exportSchedule}
              className="flex items-center px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50"
            >
              <Download size={16} className="mr-2" />
              Export
            </button>
            <button
              onClick={publishWeek}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
            >
              <Share size={16} className="mr-2" />
              Publish Week
            </button>
          </div>
        )}
      </div>

      {/* Time Grid Schedule */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-x-auto" ref={scheduleRef}>
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b border-zinc-200 bg-zinc-50 sticky top-0 z-10">
            <div className="p-4 font-medium text-zinc-500 text-sm border-r border-zinc-200">Time</div>
            {weekDays.map(day => (
              <div key={day.toString()} className="p-4 text-center border-r border-zinc-200 last:border-0">
                <div className="text-xs text-zinc-500 uppercase">{format(day, 'EEE')}</div>
                <div className="font-bold text-zinc-900">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          {/* Time Rows */}
          {timeSlots.map(timeStr => (
            <div key={timeStr} className="grid grid-cols-8 border-b border-zinc-200 last:border-0 hover:bg-zinc-50 transition-colors">
              {/* Time Label */}
              <div className="p-4 text-sm font-medium text-zinc-500 border-r border-zinc-200 flex items-center justify-center bg-zinc-50/50">
                {timeStr}
              </div>

              {/* Day Cells */}
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const cellShifts = getShiftsForCell(day, timeStr);
                const hasShifts = cellShifts.length > 0;

                return (
                  <div 
                    key={`${dateStr}-${timeStr}`} 
                    className={`p-2 border-r border-zinc-200 last:border-0 min-h-[60px] relative group transition-colors ${
                      hasShifts ? 'bg-blue-50/30' : ''
                    } ${isAdmin ? 'cursor-pointer hover:bg-zinc-100' : ''}`}
                    onClick={() => {
                      if (isAdmin) {
                        setSelectedDate(dateStr);
                        setSelectedUserId(''); // No user pre-selected for time slot
                        setSelectedShift(undefined);
                        // Pre-fill time based on slot?
                        setModalOpen(true);
                      }
                    }}
                  >
                    {!hasShifts ? (
                       <div className="h-full w-full flex items-center justify-center">
                         <span className="text-xs text-zinc-300 font-medium">Open</span>
                       </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {cellShifts.map(shift => {
                          const user = profiles.find(p => p.id === shift.user_id);
                          const userName = user?.name || 'Unknown';
                          
                          return (
                            <div
                              key={shift.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isAdmin) {
                                  setSelectedDate(dateStr);
                                  setSelectedUserId(shift.user_id);
                                  setSelectedShift(shift);
                                  setModalOpen(true);
                                }
                              }}
                              className={`px-2 py-1 rounded text-xs border shadow-sm cursor-pointer hover:scale-105 transition-transform ${
                                shift.status === 'published' 
                                  ? 'bg-blue-100 border-blue-200 text-blue-800' 
                                  : 'bg-amber-100 border-amber-200 text-amber-800'
                              }`}
                              title={`${userName}: ${shift.start_time?.slice(0,5)} - ${shift.end_time?.slice(0,5)}`}
                            >
                              <span className="font-bold">{userName}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <ShiftModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        templates={templates}
        profiles={profiles}
        initialShift={selectedShift}
        date={selectedDate}
        userId={selectedUserId}
      />
    </div>
  );
}
