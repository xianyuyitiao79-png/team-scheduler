import React, { useState, useEffect } from 'react';
import { ShiftTemplate, Shift, Profile } from '../types';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Partial<Shift>) => Promise<void> | void;
  onDelete: (id: string) => void;
  templates: ShiftTemplate[];
  profiles: Profile[];
  initialShift?: Shift;
  date: string;
  userId: string;
}

export default function ShiftModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  profiles,
  initialShift,
  date,
  userId,
}: ShiftModalProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [currentUserId, setCurrentUserId] = useState(userId);
  const [note, setNote] = useState('');
  const [historyTimes, setHistoryTimes] = useState<{start: string, end: string}[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load history from localStorage
    try {
        const stored = localStorage.getItem('shift_history_times');
        if (stored) {
            setHistoryTimes(JSON.parse(stored));
        }
    } catch (e) {
        console.error('Failed to load shift history', e);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
        if (initialShift) {
            // Prioritize direct start_time if available, else template time
            if (initialShift.start_time) {
                setStartTime(initialShift.start_time);
            } else if (initialShift.shift_templates) {
                setStartTime(initialShift.shift_templates.start_time);
            } else {
                setStartTime('');
            }
            
            if (initialShift.end_time) {
                setEndTime(initialShift.end_time);
            } else if (initialShift.shift_templates) {
                setEndTime(initialShift.shift_templates.end_time);
            } else {
                setEndTime('');
            }
            
            setCurrentUserId(initialShift.user_id || userId);
            setNote(initialShift.note || '');
        } else {
            setStartTime('');
            setEndTime('');
            setCurrentUserId(userId);
            setNote('');
        }
    }
  }, [initialShift, isOpen, userId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save to history
    if (startTime && endTime) {
        const newTime = { start: startTime, end: endTime };
        const updatedHistory = [newTime, ...historyTimes.filter(t => t.start !== startTime || t.end !== endTime)].slice(0, 5); // Keep last 5
        setHistoryTimes(updatedHistory);
        localStorage.setItem('shift_history_times', JSON.stringify(updatedHistory));
    }

    onSave({
      id: initialShift?.id,
      date,
      user_id: currentUserId,
      template_id: undefined,
      start_time: startTime,
      end_time: endTime,
      note,
      status: initialShift?.status || 'draft'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-zinc-900 mb-4">
          {initialShift ? 'Edit Shift' : 'Add Shift'}
        </h3>
        <p className="text-sm text-zinc-500 mb-4">Date: {date}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">Team Member</label>
            <select
                required
                value={currentUserId}
                onChange={e => setCurrentUserId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
            >
                {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-zinc-700">Start Time</label>
                <input
                    type="time"
                    required
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-zinc-700">End Time</label>
                <input
                    type="time"
                    required
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
                />
            </div>
          </div>

          {/* Recent History */}
          {historyTimes.length > 0 && (
            <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Recent Times</label>
                <div className="flex flex-wrap gap-2">
                    {historyTimes.map((time, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                setStartTime(time.start);
                                setEndTime(time.end);
                            }}
                            className="px-3 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-full border border-zinc-200 transition-colors"
                        >
                            {time.start} - {time.end}
                        </button>
                    ))}
                </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            {initialShift && (
              <button
                type="button"
                onClick={() => {
                    onDelete(initialShift.id);
                    onClose();
                }}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
