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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StoreSettings() {
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    const { data, error } = await supabase
      .from('operating_hours')
      .select('*')
      .order('day_of_week');
    
    if (data) {
      setHours(data);
    } else {
        // If no data, maybe init? Rely on SQL default for now, or insert if empty
        // For now assume SQL inserted defaults
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

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Clock className="h-8 w-8 text-zinc-900" />
        <h1 className="text-2xl font-bold text-zinc-900">Store Operating Hours</h1>
      </div>
      <p className="text-zinc-500">Set the default opening and closing times for the store. This affects the "Open Shifts" calculation on the dashboard.</p>

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
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
