import React, { useState, useEffect } from 'react';
import { ShiftTemplate, Shift } from '../types';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Partial<Shift>) => void;
  onDelete: (id: string) => void;
  templates: ShiftTemplate[];
  initialShift?: Shift;
  date: string;
  userId: string;
  userName: string;
}

export default function ShiftModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  templates,
  initialShift,
  date,
  userId,
  userName,
}: ShiftModalProps) {
  const [templateId, setTemplateId] = useState('');
  // const [startTime, setStartTime] = useState('');
  // const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initialShift) {
      setTemplateId(initialShift.template_id || '');
      // if (initialShift.shift_templates) {
      //     setStartTime(initialShift.shift_templates.start_time);
      //     setEndTime(initialShift.shift_templates.end_time);
      // }
      setNote(initialShift.note || '');
    } else {
      setTemplateId('');
      // setStartTime('');
      // setEndTime('');
      setNote('');
    }
  }, [initialShift, isOpen]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tid = e.target.value;
    setTemplateId(tid);
    // const tmpl = templates.find(t => t.id === tid);
    // if (tmpl) {
    //   setStartTime(tmpl.start_time);
    //   setEndTime(tmpl.end_time);
    // }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialShift?.id,
      date,
      user_id: userId,
      template_id: templateId || undefined, // If custom time, maybe no template ID? But schema links template. 
      // Prompt says "Select Template". We'll enforce template selection for simplicity, 
      // or allows custom if we had "Custom" template. 
      // Let's assume we MUST pick a template for now as per prompt "Add shift (Select Template)"
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
          {initialShift ? 'Edit Shift' : 'Add Shift'} for {userName}
        </h3>
        <p className="text-sm text-zinc-500 mb-4">Date: {date}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Template</label>
            <select
              required
              value={templateId}
              onChange={handleTemplateChange}
              className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm"
            >
              <option value="">Select a template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.start_time.slice(0, 5)} - {t.end_time.slice(0, 5)})
                </option>
              ))}
            </select>
          </div>

          {/* Time overrides could go here, but let's stick to templates for MVP stability */}

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
              className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
            >
              Save
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
