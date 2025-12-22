import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock } from 'lucide-react';

interface OperatingHour {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
}

interface SpecialOperatingHour {
  id?: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  reason?: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StoreSettings() {
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [specialHours, setSpecialHours] = useState<SpecialOperatingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpecialDate, setNewSpecialDate] = useState<SpecialOperatingHour>({
    specific_date: '',
    start_time: '10:00',
    end_time: '18:00',
    is_closed: false,
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch regular hours
    const { data: regularData, error: regularError } = await supabase
      .from('operating_hours')
      .select('*')
      .order('day_of_week');
    
    if (regularError) {
      console.error('Error fetching operating hours:', regularError);
    } else if (regularData) {
      setHours(regularData);
    }

    // Fetch special hours
    const { data: specialData, error: specialError } = await supabase
      .from('special_operating_hours')
      .select('*')
      .order('specific_date');

    if (specialError) {
        console.error('Error fetching special hours:', specialError);
    } else if (specialData) {
        setSpecialHours(specialData);
    }

    setLoading(false);
  };

  const handleChange = (index: number, field: keyof OperatingHour, value: any) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = hours.map(h => ({
        id: h.id,
        day_of_week: h.day_of_week,
        start_time: h.start_time,
        end_time: h.end_time,
        is_closed: h.is_closed
    }));

    const { error } = await supabase
        .from('operating_hours')
        .upsert(updates);

    if (error) {
        alert('Failed to save settings: ' + error.message);
    } else {
        alert('Settings saved successfully!');
    }
    setSaving(false);
  };

  const handleAddSpecialDate = async () => {
    if (!newSpecialDate.specific_date) {
        alert('Please select a date');
        return;
    }

    const { error } = await supabase
        .from('special_operating_hours')
        .insert([newSpecialDate]);

    if (error) {
        alert('Failed to add special date: ' + error.message);
    } else {
        setNewSpecialDate({
            specific_date: '',
            start_time: '10:00',
            end_time: '18:00',
            is_closed: false,
            reason: ''
        });
        fetchData(); // Reload
    }
  };

  const handleDeleteSpecialDate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this special date rule?')) return;
    
    const { error } = await supabase
        .from('special_operating_hours')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Failed to delete: ' + error.message);
    } else {
        fetchData();
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="space-y-8">
      {/* Regular Hours Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-zinc-900" />
            <h1 className="text-2xl font-bold text-zinc-900">Weekly Operating Hours</h1>
        </div>
        <p className="text-zinc-500">Set the default opening and closing times for each day of the week.</p>

        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 bg-zinc-50 border-b border-zinc-200 p-4 font-medium text-zinc-500 text-sm">
            <div>Day</div>
            <div>Open Time</div>
            <div>Close Time</div>
            <div>Status</div>
            </div>
            
            <div className="divide-y divide-zinc-200">
            {hours.map((dayHour, index) => (
                <div key={dayHour.day_of_week} className="grid grid-cols-4 p-4 items-center">
                <div className="font-medium text-zinc-900">{DAYS[dayHour.day_of_week]}</div>
                <div>
                    <input
                    type="time"
                    disabled={dayHour.is_closed}
                    value={dayHour.start_time}
                    onChange={(e) => handleChange(index, 'start_time', e.target.value)}
                    className="block w-32 px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm disabled:bg-zinc-100 disabled:text-zinc-400"
                    />
                </div>
                <div>
                    <input
                    type="time"
                    disabled={dayHour.is_closed}
                    value={dayHour.end_time}
                    onChange={(e) => handleChange(index, 'end_time', e.target.value)}
                    className="block w-32 px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm disabled:bg-zinc-100 disabled:text-zinc-400"
                    />
                </div>
                <div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!dayHour.is_closed}
                        onChange={(e) => handleChange(index, 'is_closed', !e.target.checked)}
                        className="rounded text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="text-sm text-zinc-700">{dayHour.is_closed ? 'Closed' : 'Open'}</span>
                    </label>
                </div>
                </div>
            ))}
            </div>
        </div>

        <div className="flex justify-end">
            <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50"
            >
            {saving ? 'Saving...' : 'Save Weekly Changes'}
            </button>
        </div>
      </div>

      {/* Special Dates Section */}
      <div className="space-y-4 pt-6 border-t border-zinc-200">
        <h2 className="text-xl font-bold text-zinc-900">Special Dates / Holidays</h2>
        <p className="text-zinc-500">Override the weekly schedule for specific dates (e.g., Holidays, Events).</p>

        {/* List Existing Special Dates */}
        {specialHours.length > 0 && (
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden mb-4">
                <div className="grid grid-cols-5 bg-zinc-50 border-b border-zinc-200 p-4 font-medium text-zinc-500 text-sm">
                    <div>Date</div>
                    <div>Reason</div>
                    <div>Hours</div>
                    <div>Status</div>
                    <div>Action</div>
                </div>
                <div className="divide-y divide-zinc-200">
                    {specialHours.map((sh) => (
                        <div key={sh.id} className="grid grid-cols-5 p-4 items-center">
                            <div className="font-medium text-zinc-900">{sh.specific_date}</div>
                            <div className="text-zinc-600">{sh.reason || '-'}</div>
                            <div className="text-zinc-600">
                                {sh.is_closed ? '-' : `${sh.start_time} - ${sh.end_time}`}
                            </div>
                            <div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sh.is_closed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                    {sh.is_closed ? 'Closed' : 'Open'}
                                </span>
                            </div>
                            <div>
                                <button 
                                    onClick={() => sh.id && handleDeleteSpecialDate(sh.id)}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Add New Special Date Form */}
        <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-900 mb-3">Add New Special Date</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Date</label>
                    <input 
                        type="date"
                        value={newSpecialDate.specific_date}
                        onChange={e => setNewSpecialDate({...newSpecialDate, specific_date: e.target.value})}
                        className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Reason (Optional)</label>
                    <input 
                        type="text"
                        placeholder="e.g. Christmas"
                        value={newSpecialDate.reason}
                        onChange={e => setNewSpecialDate({...newSpecialDate, reason: e.target.value})}
                        className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Start Time</label>
                    <input 
                        type="time"
                        disabled={newSpecialDate.is_closed}
                        value={newSpecialDate.start_time}
                        onChange={e => setNewSpecialDate({...newSpecialDate, start_time: e.target.value})}
                        className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm disabled:bg-zinc-200"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">End Time</label>
                    <input 
                        type="time"
                        disabled={newSpecialDate.is_closed}
                        value={newSpecialDate.end_time}
                        onChange={e => setNewSpecialDate({...newSpecialDate, end_time: e.target.value})}
                        className="block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm disabled:bg-zinc-200"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer mr-4">
                        <input
                            type="checkbox"
                            checked={newSpecialDate.is_closed}
                            onChange={(e) => setNewSpecialDate({...newSpecialDate, is_closed: e.target.checked})}
                            className="rounded text-zinc-900 focus:ring-zinc-900"
                        />
                        <span className="text-sm text-zinc-700">Closed?</span>
                    </label>
                    <button
                        onClick={handleAddSpecialDate}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 text-sm font-medium"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
