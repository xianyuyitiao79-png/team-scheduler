import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { Shield, User } from 'lucide-react';

export default function Members() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
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

  if (loading) return <div>Loading members...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Members</h1>
          <p className="text-zinc-500">Manage your team members and permissions.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</th>
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
