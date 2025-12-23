import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, Shift } from '../types';
import { Shield, User, Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks } from 'date-fns';

export default function Members() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberHours, setMemberHours] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hasDuplicates, setHasDuplicates] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    
    if (profilesData) {
      const openProfile: Profile = {
        id: 'open_shifts',
        name: 'Open Shifts',
        role: 'member',
        active: true
      };
      setProfiles([openProfile, ...(profilesData as Profile[])]);
    }

    // Fetch Shifts for Selected Week to calculate totals
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('*, shift_templates(*)')
      .gte('date', startStr)
      .lte('date', endStr);

    if (shiftsData) {
      const hoursMap: Record<string, number> = {};
      const seen = new Set<string>();
      const uniqueShifts: Shift[] = [];
      let duplicatesCount = 0;
      
      // Deduplicate in memory first
      (shiftsData as unknown as Shift[]).forEach(shift => {
        const startTime = shift.start_time || shift.shift_templates?.start_time;
        const endTime = shift.end_time || shift.shift_templates?.end_time;
        // Use a key that defines "uniqueness" for a shift slot
        const key = `${shift.user_id}|${shift.date}|${startTime}|${endTime}`;
        
        if (seen.has(key)) {
          duplicatesCount++;
        } else {
          seen.add(key);
          uniqueShifts.push(shift);
        }
      });

      setHasDuplicates(duplicatesCount > 0);
      if (duplicatesCount > 0) {
        console.log(`Found ${duplicatesCount} duplicates during calculation. Using unique shifts only.`);
      }

      uniqueShifts.forEach(shift => {
        const userId = shift.user_id;
        if (!userId) return;

        // Determine start and end times
        const startTime = shift.start_time || shift.shift_templates?.start_time;
        const endTime = shift.end_time || shift.shift_templates?.end_time;
        const breakMinutes = shift.shift_templates?.break_minutes || 0;

        if (startTime && endTime) {
          const start = timeToMinutes(startTime);
          const end = timeToMinutes(endTime);
          
          // Handle duration
          let duration = end - start;
          if (duration < 0) duration += 24 * 60; // Handle overnight crossing midnight if any
          
          // Subtract break time
          duration = Math.max(0, duration - breakMinutes);
          
          const hours = duration / 60;
          
          // console.log(`Debug: ${userId} +${hours}h on ${shift.date}`);
          hoursMap[userId] = (hoursMap[userId] || 0) + hours;
        }
      });
      setMemberHours(hoursMap);
    }

    setLoading(false);
  };

  const handlePrevWeek = () => setCurrentDate(d => subWeeks(d, 1));
  const handleNextWeek = () => setCurrentDate(d => addWeeks(d, 1));

  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const toggleRole = async (profile: Profile) => {
    const newRole = profile.role === 'admin' ? 'member' : 'admin';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profile.id);

    if (!error) {
      setProfiles(profiles.map(p => p.id === profile.id ? { ...p, role: newRole } : p));
    }
  };

  const toggleActive = async (profile: Profile) => {
    const newActive = !profile.active;
    const { error } = await supabase
      .from('profiles')
      .update({ active: newActive })
      .eq('id', profile.id);

    if (!error) {
      setProfiles(profiles.map(p => p.id === profile.id ? { ...p, active: newActive } : p));
    }
  };

  const fixDuplicates = async () => {
    if (!confirm('This will check for and remove duplicate shifts (same user, date, time). Continue?')) return;
    setLoading(true);
    
    try {
      // Fetch all shifts for the current view or all time? 
      // Safer to just do current week first, but duplicates might exist elsewhere.
      // Let's do all shifts to be thorough, but maybe just current week to be safe and fast.
      // The user complained about the displayed numbers, so current week is the priority.
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const { data: shifts, error } = await supabase
        .from('shifts')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr);

      if (error) throw error;
      if (!shifts) return;

      const seen = new Set<string>();
      const duplicates: string[] = [];

      shifts.forEach((shift: any) => {
        // Unique key based on content
        const key = `${shift.user_id}|${shift.date}|${shift.template_id}|${shift.start_time}|${shift.end_time}`;
        if (seen.has(key)) {
          duplicates.push(shift.id);
        } else {
          seen.add(key);
        }
      });

      if (duplicates.length > 0) {
        const { error: deleteError } = await supabase
          .from('shifts')
          .delete()
          .in('id', duplicates);
          
        if (deleteError) throw deleteError;
        alert(`Removed ${duplicates.length} duplicate shifts.`);
        fetchData();
      } else {
        alert('No duplicates found in this week.');
      }
    } catch (err: any) {
      console.error('Error fixing duplicates:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading members...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Members</h1>
          <p className="text-zinc-500">Manage your team members and permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-zinc-300 rounded-md shadow-sm">
            <button 
              onClick={handlePrevWeek}
              className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-l-md border-r border-zinc-200"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-4 py-2 text-sm font-medium text-zinc-900 min-w-[180px] text-center">
              {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </div>
            <button 
              onClick={handleNextWeek}
              className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-r-md border-l border-zinc-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button 
            onClick={fixDuplicates}
            className={`px-3 py-2 border rounded-md text-sm font-medium shadow-sm ${
              hasDuplicates 
                ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 animate-pulse' 
                : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {hasDuplicates ? 'Fix Duplicates (!)' : 'Check Duplicates'}
          </button>
          <button 
            onClick={fetchData} 
            className="flex items-center px-3 py-2 bg-white border border-zinc-300 rounded-md text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm"
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Total Hours ({format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MM/dd')} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MM/dd')})
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200">
            {profiles.map((profile) => (
              <tr key={profile.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold mr-3">
                      {profile.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="text-sm font-medium text-zinc-900">{profile.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    profile.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-zinc-100 text-zinc-800'
                  }`}>
                    {profile.role === 'admin' ? <Shield size={12} className="mr-1" /> : <User size={12} className="mr-1" />}
                    {profile.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-zinc-900">
                    <Clock size={16} className="mr-1.5 text-zinc-400" />
                    <span className="font-medium">
                      {Math.round((memberHours[profile.id] || 0) * 10) / 10}h
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    profile.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {profile.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => toggleRole(profile)}
                    className="text-zinc-600 hover:text-zinc-900"
                  >
                    Switch Role
                  </button>
                  <button
                    onClick={() => toggleActive(profile)}
                    className={profile.active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                  >
                    {profile.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
