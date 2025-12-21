import { useEffect, useState, useRef } from 'react';
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
import { ChevronLeft, ChevronRight, Download, Share, AlertCircle } from 'lucide-react';
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


  const displayedProfiles = onlyMyShifts 
    ? profiles.filter(p => p.id === profile?.id) 
    : profiles;

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

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-x-auto" ref={scheduleRef}>
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b border-zinc-200 bg-zinc-50">
            <div className="p-4 font-medium text-zinc-500 text-sm">Team Member</div>
            {weekDays.map(day => (
              <div key={day.toString()} className="p-4 text-center border-l border-zinc-200">
                <div className="text-xs text-zinc-500 uppercase">{format(day, 'EEE')}</div>
                <div className="font-bold text-zinc-900">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          {/* User Rows */}
          {displayedProfiles.map(user => (
            <div key={user.id} className="grid grid-cols-8 border-b border-zinc-200 last:border-0">
              {/* User Name Cell */}
              <div className="p-4 flex items-center">
                <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold mr-3">
                  {user.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="text-sm font-medium text-zinc-900 truncate">{user.name}</div>
              </div>

              {/* Day Cells */}
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const userShifts = shifts.filter(s => s.user_id === user.id && s.date === dateStr);
                const isConflict = userShifts.length > 1;

                return (
                  <div 
                    key={dateStr} 
                    className={`p-2 border-l border-zinc-200 min-h-[80px] relative group ${isAdmin ? 'cursor-pointer hover:bg-zinc-50' : ''}`}
                    onClick={() => {
                      if (isAdmin) {
                        setSelectedDate(dateStr);
                        setSelectedUserId(user.id);
                        setSelectedShift(undefined); // Default to add
                        setModalOpen(true);
                      }
                    }}
                  >
                    {userShifts.map(shift => (
                      <div
                        key={shift.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAdmin) {
                            setSelectedDate(dateStr);
                            setSelectedUserId(user.id);
                            setSelectedShift(shift);
                            setModalOpen(true);
                          }
                        }}
                        className={`mb-1 p-2 rounded text-xs border ${
                          shift.status === 'published' 
                            ? 'bg-blue-50 border-blue-200 text-blue-800' 
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        } ${isAdmin ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}
                      >
                        <div className="font-bold">
                          {(shift.start_time || shift.shift_templates?.start_time || '').slice(0, 5)} - {(shift.end_time || shift.shift_templates?.end_time || '').slice(0, 5)}
                        </div>
                        <div className="truncate">{shift.shift_templates?.name || 'Custom'}</div>
                        {shift.status === 'draft' && <div className="text-[10px] uppercase mt-1 text-amber-600 font-bold">Draft</div>}
                      </div>
                    ))}
                    
                    {isConflict && (
                      <div className="absolute top-1 right-1 text-red-500" title="Conflict: Multiple shifts">
                        <AlertCircle size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          
          {displayedProfiles.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No members found.
            </div>
          )}
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
