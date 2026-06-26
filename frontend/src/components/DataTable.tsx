import { useState, useMemo } from 'react';
import { AuthRequest } from '../data/mockData';
import { format } from 'date-fns';
import { cn } from '../utils/cn';
import { ArrowUpDown, Search } from 'lucide-react';

interface DataTableProps {
  data: AuthRequest[];
  darkMode: boolean;
}

type SortField = 'date' | 'patientId' | 'facility' | 'status' | 'urSpecialist';
type SortOrder = 'asc' | 'desc';

export default function DataTable({ data, darkMode }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    return data
      .filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.patientId.toLowerCase().includes(searchLower) ||
          item.facility.toLowerCase().includes(searchLower) ||
          item.urSpecialist.toLowerCase().includes(searchLower) ||
          item.payer.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];
        
        if (sortField === 'date') {
          aVal = a.date.getTime();
          bVal = b.date.getTime();
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      })
      .slice(0, 10); // Show only top 10 recent/filtered for the dashboard
  }, [data, searchTerm, sortField, sortOrder]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'Denied': return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400';
      case 'Pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400';
      case 'P2P': return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400';
      case 'Appealed': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const thClass = cn(
    "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer group",
    darkMode ? "text-gray-400 bg-gray-900 border-gray-800" : "text-gray-500 bg-gray-50 border-gray-200"
  );
  
  const tdClass = cn(
    "px-4 py-3 text-sm whitespace-nowrap border-t",
    darkMode ? "border-gray-800" : "border-gray-100"
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 relative shrink-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className={cn("h-4 w-4", darkMode ? "text-gray-500" : "text-gray-400")} />
        </div>
        <input
          type="text"
          placeholder="Search patient, facility, specialist..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn(
            "w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
            darkMode ? "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
          )}
        />
      </div>
      
      <div className="overflow-x-auto flex-1 min-h-[300px]">
        <table className="min-w-full w-full">
          <thead>
            <tr>
              <th className={thClass} onClick={() => handleSort('date')}>
                <div className="flex items-center">Date <ArrowUpDown className="ml-1 w-3 h-3 opacity-50 group-hover:opacity-100" /></div>
              </th>
              <th className={thClass} onClick={() => handleSort('patientId')}>
                <div className="flex items-center">Patient <ArrowUpDown className="ml-1 w-3 h-3 opacity-50 group-hover:opacity-100" /></div>
              </th>
              <th className={thClass} onClick={() => handleSort('facility')}>
                <div className="flex items-center">Facility <ArrowUpDown className="ml-1 w-3 h-3 opacity-50 group-hover:opacity-100" /></div>
              </th>
              <th className={thClass} onClick={() => handleSort('status')}>
                <div className="flex items-center">Status <ArrowUpDown className="ml-1 w-3 h-3 opacity-50 group-hover:opacity-100" /></div>
              </th>
              <th className={thClass}>
                <div className="flex items-center">Days (Req/Appr)</div>
              </th>
              <th className={thClass} onClick={() => handleSort('urSpecialist')}>
                <div className="flex items-center">Specialist <ArrowUpDown className="ml-1 w-3 h-3 opacity-50 group-hover:opacity-100" /></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.map((row) => (
              <tr key={row.id} className={cn("transition-colors", darkMode ? "hover:bg-gray-800/50" : "hover:bg-gray-50")}>
                <td className={tdClass}>{format(row.date, 'MMM d, yyyy')}</td>
                <td className={tdClass}>
                  <div className="font-medium">{row.patientId}</div>
                  <div className={cn("text-xs", darkMode ? "text-gray-500" : "text-gray-500")}>{row.payer}</div>
                </td>
                <td className={tdClass}>{row.facility}</td>
                <td className={tdClass}>
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", getStatusColor(row.status))}>
                    {row.status}
                  </span>
                </td>
                <td className={tdClass}>
                  <span className={cn("text-sm", row.approvedDays < row.requestedDays && row.status === 'Approved' ? "text-amber-500 font-medium" : "")}>
                    {row.requestedDays} / {row.status === 'Pending' ? '-' : row.approvedDays}
                  </span>
                </td>
                <td className={tdClass}>{row.urSpecialist}</td>
              </tr>
            ))}
            {filteredAndSortedData.length === 0 && (
              <tr>
                <td colSpan={6} className={cn("px-4 py-8 text-center text-sm", darkMode ? "text-gray-500" : "text-gray-500")}>
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
