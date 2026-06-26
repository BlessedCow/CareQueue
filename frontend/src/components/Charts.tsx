import { useMemo } from 'react';
import { AuthRequest } from '../data/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ChartProps {
  data: AuthRequest[];
  darkMode: boolean;
}

export function TrendChart({ data, darkMode }: ChartProps) {
  const chartData = useMemo(() => {
    const countsByDate = data.reduce((acc, curr) => {
      if (!acc[curr.dateStr]) {
        acc[curr.dateStr] = { date: curr.dateStr, Approved: 0, Denied: 0, Pending: 0, Total: 0 };
      }
      if (curr.status === 'Approved') acc[curr.dateStr].Approved++;
      else if (curr.status === 'Denied') acc[curr.dateStr].Denied++;
      else if (curr.status === 'Pending') acc[curr.dateStr].Pending++;
      acc[curr.dateStr].Total++;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(countsByDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const textColor = darkMode ? '#9CA3AF' : '#4B5563';
  const gridColor = darkMode ? '#374151' : '#E5E7EB';

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke={textColor} 
            fontSize={12} 
            tickFormatter={(val) => format(parseISO(val), 'MMM d')} 
            tickMargin={10}
            minTickGap={20}
          />
          <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', borderColor: darkMode ? '#374151' : '#E5E7EB', color: darkMode ? '#F3F4F6' : '#111827', borderRadius: '8px' }}
            labelFormatter={(label) => format(parseISO(label), 'MMM d, yyyy')}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Line type="monotone" dataKey="Approved" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="Denied" stroke="#F43F5E" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="Pending" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LOCChart({ data, darkMode }: ChartProps) {
  const chartData = useMemo(() => {
    const locCounts = data.reduce((acc, curr) => {
      acc[curr.loc] = (acc[curr.loc] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(locCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [data]);

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];

  return (
    <div className="h-80 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={darkMode ? '#111827' : '#ffffff'} strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', borderColor: darkMode ? '#374151' : '#E5E7EB', color: darkMode ? '#F3F4F6' : '#111827', borderRadius: '8px' }}
            itemStyle={{ color: darkMode ? '#F3F4F6' : '#111827' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DenialChart({ data, darkMode }: ChartProps) {
  const chartData = useMemo(() => {
    const denialCounts = data.filter(d => d.denialReason).reduce((acc, curr) => {
      if (curr.denialReason) {
        acc[curr.denialReason] = (acc[curr.denialReason] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(denialCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const textColor = darkMode ? '#9CA3AF' : '#4B5563';
  const gridColor = darkMode ? '#374151' : '#E5E7EB';

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis type="number" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis 
            dataKey="name" 
            type="category" 
            stroke={textColor} 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            width={100}
          />
          <Tooltip 
            cursor={{ fill: darkMode ? '#374151' : '#F3F4F6' }}
            contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', borderColor: darkMode ? '#374151' : '#E5E7EB', color: darkMode ? '#F3F4F6' : '#111827', borderRadius: '8px' }}
          />
          <Bar dataKey="value" fill="#F43F5E" radius={[0, 4, 4, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
