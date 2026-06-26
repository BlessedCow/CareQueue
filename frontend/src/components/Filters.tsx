import { Filter, Calendar } from 'lucide-react';

import { cn } from '../utils/cn';

interface FiltersProps {
  dateRange: '7d' | '30d' | '90d';
  setDateRange: (val: '7d' | '30d' | '90d') => void;
  selectedFacility: string;
  setSelectedFacility: (val: string) => void;
  darkMode: boolean;
}

const FACILITIES = ['All', 'Ocean View Recovery', 'Mountain Peak Wellness', 'Desert Hope Center', 'Urban Path MH'];

export default function Filters({ dateRange, setDateRange, selectedFacility, setSelectedFacility, darkMode }: FiltersProps) {
  const selectClasses = cn(
    "appearance-none rounded-lg border py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
    darkMode ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-300 text-gray-800"
  );

  return (
    <div className={cn("flex flex-col sm:flex-row gap-4 p-4 rounded-xl border shadow-sm", darkMode ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200")}>
      <div className="flex items-center gap-2">
        <Calendar className={cn("w-5 h-5", darkMode ? "text-gray-400" : "text-gray-500")} />
        <div className="relative">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className={selectClasses}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter className={cn("w-5 h-5", darkMode ? "text-gray-400" : "text-gray-500")} />
        <div className="relative">
          <select 
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value as any)}
            className={selectClasses}
          >
            {FACILITIES.map(f => (
              <option key={f} value={f}>{f === 'All' ? 'All Facilities' : f}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
