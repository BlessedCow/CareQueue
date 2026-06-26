import { useMemo } from 'react';
import { AuthRequest } from '../data/mockData';
import { cn } from '../utils/cn';
import { CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardsProps {
  data: AuthRequest[];
  darkMode: boolean;
}

export default function KPICards({ data, darkMode }: KPICardsProps) {
  const stats = useMemo(() => {
    const total = data.length;
    if (total === 0) return { total: 0, approved: 0, denied: 0, pending: 0, approvalRate: 0, trends: { total: '+0%', rate: '+0%', denied: '-0%', pending: '+0%' } };
    
    const approved = data.filter(d => d.status === 'Approved').length;
    const denied = data.filter(d => d.status === 'Denied').length;
    const pending = data.filter(d => d.status === 'Pending').length;
    
    // Simulate trends based on data volume to look somewhat alive
    const trendTotal = total > 50 ? '+12%' : '-4%';
    const trendRate = approved / total > 0.6 ? '+2.4%' : '-1.2%';
    const trendDenied = denied > 10 ? '+5%' : '-2%';
    const trendPending = pending > 5 ? '+1%' : '-3%';

    return {
      total,
      approved,
      denied,
      pending,
      approvalRate: Math.round((approved / total) * 100),
      trends: { total: trendTotal, rate: trendRate, denied: trendDenied, pending: trendPending }
    };
  }, [data]);

  const cards = [
    {
      title: 'Total Requests',
      value: stats.total,
      icon: <Clock className="w-6 h-6 text-blue-500" />,
      trend: stats.trends.total,
      trendIcon: stats.trends.total.startsWith('+') ? 'up' : 'down',
      trendColor: stats.trends.total.startsWith('+') ? 'green' : 'red',
      color: 'blue'
    },
    {
      title: 'Approval Rate',
      value: `${stats.approvalRate}%`,
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
      trend: stats.trends.rate,
      trendIcon: stats.trends.rate.startsWith('+') ? 'up' : 'down',
      trendColor: stats.trends.rate.startsWith('+') ? 'green' : 'red',
      color: 'emerald'
    },
    {
      title: 'Denied',
      value: stats.denied,
      icon: <XCircle className="w-6 h-6 text-rose-500" />,
      trend: stats.trends.denied,
      trendIcon: stats.trends.denied.startsWith('+') ? 'up' : 'down',
      trendColor: stats.trends.denied.startsWith('+') ? 'red' : 'green', // Less denied is better
      color: 'rose'
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: <Clock className="w-6 h-6 text-amber-500" />,
      trend: stats.trends.pending,
      trendIcon: stats.trends.pending.startsWith('+') ? 'up' : 'down',
      trendColor: stats.trends.pending.startsWith('+') ? 'red' : 'green', // Less pending is better
      color: 'amber'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div 
          key={i} 
          className={cn(
            "p-5 rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md",
            darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className={cn("text-sm font-medium", darkMode ? "text-gray-400" : "text-gray-500")}>
              {card.title}
            </h4>
            <div className={cn("p-2 rounded-lg", darkMode ? `bg-${card.color}-500/10` : `bg-${card.color}-50`)}>
              {card.icon}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-bold">{card.value}</h2>
            <div className={cn(
              "flex items-center text-sm font-medium",
              card.trendColor === 'green' ? "text-emerald-500" : "text-rose-500"
            )}>
              {card.trendIcon === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {card.trend}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
