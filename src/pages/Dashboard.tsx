import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { supabase } from '../lib/supabase';
import { Shift } from '../types';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { CalendarDays, ShieldCheck, UserCog } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const [nextShift, setNextShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNextShift() {
      if (!profile) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('shifts')
        .select('*, shift_templates(*)')
        .eq('user_id', profile.id)
        .gte('date', today)
        .eq('status', 'published')
        .order('date', { ascending: true })
        .limit(1);

      if (!error && data && data.length > 0) {
        setNextShift(data[0] as unknown as Shift);
      }
      setLoading(false);
    }

    fetchNextShift();
  }, [profile]);

  const fixPermissions = async () => {
    if (!profile) return;
    const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', profile.id);
    
    if (!error) {
        alert('Permissions fixed! Reloading...');
        window.location.reload();
    } else {
        alert('Failed to fix permissions: ' + error.message);
    }
  };

  const updateName = async () => {
    if (!profile) return;
    const newName = window.prompt('Enter your new display name:', profile.name);
    if (newName && newName !== profile.name) {
        const { error } = await supabase
            .from('profiles')
            .update({ name: newName })
            .eq('id', profile.id);
        
        if (!error) {
            alert('Name updated successfully!');
            window.location.reload();
        } else {
            alert('Failed to update name: ' + error.message);
        }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Welcome back, {profile?.name || 'Team Member'}
        </h1>
        <p className="text-zinc-500">Here's what's happening with your schedule.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next Shift Card */}
        <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-medium text-zinc-900 mb-4">Your Next Shift</h3>
          {loading ? (
            <div className="animate-pulse h-20 bg-zinc-100 rounded"></div>
          ) : nextShift ? (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-zinc-900">
                {format(parseISO(nextShift.date), 'EEEE, MMM d')}
              </div>
              <div className="text-xl text-zinc-600">
                {nextShift.shift_templates?.start_time?.slice(0, 5)} - {nextShift.shift_templates?.end_time?.slice(0, 5)}
              </div>
              <div className="inline-block px-2 py-1 bg-zinc-100 text-zinc-600 text-sm rounded">
                {nextShift.shift_templates?.name}
              </div>
            </div>
          ) : (
            <div className="text-zinc-500 py-4">
              No upcoming shifts found.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-medium text-zinc-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link 
              to="/schedule"
              className="flex items-center justify-between p-3 rounded-md bg-zinc-50 hover:bg-zinc-100 transition-colors border border-zinc-200"
            >
              <span className="font-medium text-zinc-700">View Full Schedule</span>
              <CalendarDays size={20} className="text-zinc-400" />
            </Link>

            <button
                onClick={updateName}
                className="w-full flex items-center justify-between p-3 rounded-md bg-zinc-50 hover:bg-zinc-100 transition-colors border border-zinc-200 text-left"
            >
                <span className="font-medium text-zinc-700">Update Profile Name</span>
                <UserCog size={20} className="text-zinc-400" />
            </button>
            
            {profile?.role !== 'admin' && (
                <button
                    onClick={fixPermissions}
                    className="w-full flex items-center justify-between p-3 rounded-md bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200 text-left"
                >
                    <span className="font-medium text-amber-900">Fix Admin Permissions</span>
                    <ShieldCheck size={20} className="text-amber-600" />
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
