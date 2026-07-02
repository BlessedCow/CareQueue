import { useMemo } from 'react';
import { CheckCircle2, Clock, TrendingDown, TrendingUp, XCircle } from 'lucide-react';

import { AuthRequest } from '../data/mockData';
import { cn } from '../utils/cn';

interface KPICardsProps {
  data: AuthRequest[];
  comparisonData: AuthRequest[];
  darkMode: boolean;
}

interface KPIStats {
  total: number;
  approved: number;
  denied: number;
  pending: number;
  approvalRate: number;
}

function calculateStats(data: AuthRequest[]): KPIStats {
  const total = data.length;
  const approved = data.filter((item) => item.status === 'Approved').length;
  const denied = data.filter((item) => item.status === 'Denied').length;
  const pending = data.filter((item) => item.status === 'Pending').length;

  return {
    total,
    approved,
    denied,
    pending,
    approvalRate: total === 0 ? 0 : Math.round((approved / total) * 100),
  };
}

function formatCountChange(currentValue: number, previousValue: number) {
  if (previousValue === 0 && currentValue === 0) {
    return '0%';
  }

  if (previousValue === 0) {
    return '+100%';
  }

  const change = ((currentValue - previousValue) / previousValue) * 100;
  const roundedChange = Math.round(change);

  if (roundedChange > 0) {
    return `+${roundedChange}%`;
  }

  return `${roundedChange}%`;
}

function formatRateChange(currentRate: number, previousRate: number) {
  const change = currentRate - previousRate;

  if (change > 0) {
    return `+${change} pts`;
  }

  return `${change} pts`;
}

function isPositiveTrend(value: string) {
  return value.startsWith('+');
}

export default function KPICards({ data, comparisonData, darkMode }: KPICardsProps) {
  const stats = useMemo(() => {
    const currentStats = calculateStats(data);
    const previousStats = calculateStats(comparisonData);

    return {
      ...currentStats,
      trends: {
        total: formatCountChange(currentStats.total, previousStats.total),
        rate: formatRateChange(currentStats.approvalRate, previousStats.approvalRate),
        denied: formatCountChange(currentStats.denied, previousStats.denied),
        pending: formatCountChange(currentStats.pending, previousStats.pending),
      },
    };
  }, [data, comparisonData]);

  const cards = [
    {
      title: 'Total Requests',
      value: stats.total,
      icon: <Clock className="h-6 w-6 text-blue-500" />,
      trend: stats.trends.total,
      trendIcon: isPositiveTrend(stats.trends.total) ? 'up' : 'down',
      trendColor: isPositiveTrend(stats.trends.total) ? 'green' : 'red',
      color: 'blue',
    },
    {
      title: 'Approval Rate',
      value: `${stats.approvalRate}%`,
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
      trend: stats.trends.rate,
      trendIcon: isPositiveTrend(stats.trends.rate) ? 'up' : 'down',
      trendColor: isPositiveTrend(stats.trends.rate) ? 'green' : 'red',
      color: 'emerald',
    },
    {
      title: 'Denied',
      value: stats.denied,
      icon: <XCircle className="h-6 w-6 text-rose-500" />,
      trend: stats.trends.denied,
      trendIcon: isPositiveTrend(stats.trends.denied) ? 'up' : 'down',
      trendColor: isPositiveTrend(stats.trends.denied) ? 'red' : 'green',
      color: 'rose',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: <Clock className="h-6 w-6 text-amber-500" />,
      trend: stats.trends.pending,
      trendIcon: isPositiveTrend(stats.trends.pending) ? 'up' : 'down',
      trendColor: isPositiveTrend(stats.trends.pending) ? 'red' : 'green',
      color: 'amber',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={cn(
            'rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md',
            darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200',
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <h4 className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>
              {card.title}
            </h4>
            <div
              className={cn(
                'rounded-lg p-2',
                card.color === 'blue' && (darkMode ? 'bg-blue-500/10' : 'bg-blue-50'),
                card.color === 'emerald' && (darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'),
                card.color === 'rose' && (darkMode ? 'bg-rose-500/10' : 'bg-rose-50'),
                card.color === 'amber' && (darkMode ? 'bg-amber-500/10' : 'bg-amber-50'),
              )}
            >
              {card.icon}
            </div>
          </div>

          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-bold">{card.value}</h2>
            <div
              className={cn(
                'flex items-center text-sm font-medium',
                card.trendColor === 'green' ? 'text-emerald-500' : 'text-rose-500',
              )}
            >
              {card.trendIcon === 'up' ? (
                <TrendingUp className="mr-1 h-4 w-4" />
              ) : (
                <TrendingDown className="mr-1 h-4 w-4" />
              )}
              {card.trend}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}