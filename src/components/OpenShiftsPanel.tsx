import { useState } from 'react';
import { OpenShiftDay } from '../lib/computeOpenShifts';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Clock, AlertCircle, X } from 'lucide-react';

interface OpenShiftsPanelProps {
  openShifts: OpenShiftDay[];
  isOpen: boolean;
  onClose: () => void;
}

export default function OpenShiftsPanel({ openShifts, isOpen, onClose }: OpenShiftsPanelProps) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const toggleDay = (date: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40 border-l border-zinc-200 overflow-y-auto pt-16 lg:pt-0">
      <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-amber-600" />
          Open Shifts
        </h2>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-zinc-200 rounded-full transition-colors"
        >
          <X size={20} className="text-zinc-500" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {openShifts.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            <p>No open shifts found.</p>
            <p className="text-sm">All templates are fully covered!</p>
          </div>
        ) : (
          openShifts.map((day) => {
            const isExpanded = expandedDays[day.date] !== false; // Default open
            const dayDate = new Date(day.date);

            return (
              <div key={day.date} className="border border-zinc-200 rounded-md overflow-hidden">
                <button
                  onClick={() => toggleDay(day.date)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
                >
                  <span className="font-medium text-zinc-900">
                    {format(dayDate, 'EEE, MMM d')}
                  </span>
                  <div className="flex items-center text-zinc-500">
                    <span className="text-xs mr-2 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                      {day.items.length}
                    </span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-zinc-100">
                    {day.items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white hover:bg-zinc-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-semibold text-zinc-700">
                            {item.templateName}
                          </span>
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            {Math.round(item.minutes / 60 * 10) / 10}h
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-zinc-500">
                          <Clock size={14} className="mr-1.5" />
                          {format(item.startDateTime, 'HH:mm')} - {format(item.endDateTime, 'HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
