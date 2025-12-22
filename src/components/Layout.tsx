import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Settings,
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout() {
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, adminOnly: false },
    { name: 'Schedule', href: '/schedule', icon: CalendarDays, adminOnly: false },
    { name: 'Members', href: '/members', icon: Users, adminOnly: true },
    { name: 'Store Settings', href: '/settings', icon: Settings, adminOnly: true },
  ];

  const filteredNav = navigation.filter(
    item => !item.adminOnly || profile?.role === 'admin'
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md bg-white shadow-md border border-zinc-200"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-zinc-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-center h-16 border-b border-zinc-200">
          <h1 className="text-xl font-bold text-zinc-900">Team Scheduler</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive 
                  ? "bg-zinc-100 text-zinc-900" 
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-200">
          <div 
            className="flex items-center mb-4 cursor-pointer hover:bg-zinc-50 p-2 rounded-md transition-colors -mx-2"
            onClick={updateName}
            title="Click to update name"
          >
            <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 font-bold">
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-zinc-900 truncate w-32">{profile?.name || 'User'}</p>
              <p className="text-xs text-zinc-500 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-16 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
