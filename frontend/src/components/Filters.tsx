import { Filter, Calendar } from 'lucide-react';

import { cn } from '../utils/cn';

interface FiltersProps {
  dateRange: '7d' | '30d' | '90d';
  setDateRange: (val: '7d' | '30d' | '90d') => void;
  selectedFacility: string;
  setSelectedFacility: (val: string) => void;
  facilities: string[];
  darkMode: boolean;
}

export default function Filters({
  dateRange,
  setDateRange,
  selectedFacility,
  setSelectedFacility,
  facilities,
  darkMode,
}: FiltersProps) {
  const selectClasses = cn(
    'appearance-none rounded-lg border py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
    darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-800',
  );

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row gap-4 p-4 rounded-xl border shadow-sm',
        darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200',
      )}
    >
      <div className="flex items-center gap-2">
        <Calendar className={cn('w-5 h-5', darkMode ? 'text-gray-400' : 'text-gray-500')} />
        <div className="relative">
          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value as '7d' | '30d' | '90d')}
            className={selectClasses}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter className={cn('w-5 h-5', darkMode ? 'text-gray-400' : 'text-gray-500')} />
        <div className="relative">
          <select
            value={selectedFacility}
            onChange={(event) => setSelectedFacility(event.target.value)}
            className={selectClasses}
          >
            {facilities.map((facility) => (
              <option key={facility} value={facility}>
                {facility}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}