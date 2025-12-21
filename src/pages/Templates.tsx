import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShiftTemplate } from '../types';
import { Trash2, Plus } from 'lucide-react';

export default function Templates() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<ShiftTemplate>>({
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 60
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('shift_templates')
      .select('*')
      .order('start_time');
    
    if (data) setTemplates(data as ShiftTemplate[]);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.start_time || !newTemplate.end_time) return;

    const { data } = await supabase
      .from('shift_templates')
      .insert([newTemplate])
      .select()
      .single();

    if (data) {
      setTemplates([...templates, data as ShiftTemplate]);
      setIsCreating(false);
      setNewTemplate({ name: '', start_time: '09:00', end_time: '17:00', break_minutes: 60 });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will not affect existing shifts.')) return;
    
    const { error } = await supabase
      .from('shift_templates')
      .delete()
      .eq('id', id);

    if (!error) {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  if (loading) return <div>Loading templates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Shift Templates</h1>
          <p className="text-zinc-500">Define standard shifts for quick scheduling.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          New Template
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm mb-6">
          <h3 className="text-lg font-medium text-zinc-900 mb-4">Create Template</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Name</label>
              <input
                type="text"
                required
                value={newTemplate.name}
                onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                placeholder="e.g. Morning Shift"
                className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Start Time</label>
              <input
                type="time"
                required
                value={newTemplate.start_time}
                onChange={e => setNewTemplate({...newTemplate, start_time: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">End Time</label>
              <input
                type="time"
                required
                value={newTemplate.end_time}
                onChange={e => setNewTemplate({...newTemplate, end_time: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white p-6 rounded-lg border border-zinc-200 shadow-sm relative group">
            <button
              onClick={() => handleDelete(template.id)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={18} />
            </button>
            <h3 className="text-lg font-bold text-zinc-900">{template.name}</h3>
            <div className="mt-2 text-zinc-600 flex items-center">
              <span className="text-2xl font-light">{template.start_time.slice(0, 5)}</span>
              <span className="mx-2 text-zinc-400">-</span>
              <span className="text-2xl font-light">{template.end_time.slice(0, 5)}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-500">{template.break_minutes} min break</p>
          </div>
        ))}
      </div>
    </div>
  );
}
