import { AlertCircle, CalendarClock, CheckCircle2, Clock, FileWarning, RefreshCw } from 'lucide-react';

import { AuthRequest } from '../types/auth';
import { cn } from '../utils/cn';

interface UpcomingWorkflowCardProps {
  data: AuthRequest[];
  darkMode: boolean;
}

interface WorkflowItem {
  label: string;
  count: number;
  description: string;
  icon: typeof Clock;
  tone: 'pending' | 'p2p' | 'appeal' | 'denied' | 'complete' | 'due' | 'overdue';
}

interface DatedWorkflowItem {
  auth: AuthRequest;
  label: string;
  dateLabel: string;
  daysUntil: number;
  tone: 'due' | 'overdue';
}

function parseDateOnly(value?: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDaysUntil(value?: string) {
  const date = parseDateOnly(value);

  if (!date) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date.getTime() - startOfToday().getTime()) / millisecondsPerDay);
}

function formatDate(value?: string) {
  const date = parseDateOnly(value);

  if (!date) {
    return 'No date';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isActiveWorkflowStatus(item: AuthRequest) {
  return !["Completed", "Discharged", "No PA Required"].includes(item.status);
}

function getDatePhrase(daysUntil: number) {
  if (daysUntil < 0) {
    return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`;
  }

  if (daysUntil === 0) {
    return 'Due today';
  }

  if (daysUntil === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${daysUntil} days`;
}

function getDatedWorkflowItems(data: AuthRequest[]): DatedWorkflowItem[] {
  const items: DatedWorkflowItem[] = [];

  data.filter(isActiveWorkflowStatus).forEach((auth) => {
    const reviewDaysUntil = getDaysUntil(auth.reviewDueDate);
    const lcdDaysUntil = getDaysUntil(auth.authEndDate);

    if (reviewDaysUntil !== null && reviewDaysUntil <= 7) {
      items.push({
        auth,
        label: 'Review Due',
        dateLabel: formatDate(auth.reviewDueDate),
        daysUntil: reviewDaysUntil,
        tone: reviewDaysUntil < 0 ? 'overdue' : 'due',
      });
    }

    if (lcdDaysUntil !== null && lcdDaysUntil <= 7) {
      items.push({
        auth,
        label: 'LCD',
        dateLabel: formatDate(auth.authEndDate),
        daysUntil: lcdDaysUntil,
        tone: lcdDaysUntil < 0 ? 'overdue' : 'due',
      });
    }
  });

  return items
    .sort((firstItem, secondItem) => firstItem.daysUntil - secondItem.daysUntil)
    .slice(0, 5);
}

function getWorkflowItems(data: AuthRequest[]): WorkflowItem[] {
  const datedItems = getDatedWorkflowItems(data);
  const overdueCount = datedItems.filter((item) => item.daysUntil < 0).length;
  const dueSoonCount = datedItems.filter((item) => item.daysUntil >= 0).length;

  const pendingCount = data.filter((item) => item.status === 'Pending').length;
  const p2pCount = data.filter((item) => item.status === 'P2P').length;
  const appealedCount = data.filter((item) => item.status === 'Appealed').length;
  const deniedCount = data.filter((item) => item.status === 'Denied').length;
  const approvedCount = data.filter((item) => item.status === 'Approved').length;

  return [
    {
      label: 'Overdue Items',
      count: overdueCount,
      description: 'Review dates or LCDs that have already passed.',
      icon: AlertCircle,
      tone: 'overdue',
    },
    {
      label: 'Due Soon',
      count: dueSoonCount,
      description: 'Reviews or LCDs due within the next 7 days.',
      icon: CalendarClock,
      tone: 'due',
    },
    {
      label: 'Pending Auths',
      count: pendingCount,
      description: 'Awaiting payer response or next action.',
      icon: Clock,
      tone: 'pending',
    },
    {
      label: 'P2P Needed',
      count: p2pCount,
      description: 'Peer review or escalation workflow needed.',
      icon: AlertCircle,
      tone: 'p2p',
    },
    {
      label: 'Appeals Pending',
      count: appealedCount,
      description: 'Cases currently in appeal status.',
      icon: RefreshCw,
      tone: 'appeal',
    },
    {
      label: 'Denied Auths',
      count: deniedCount,
      description: 'Denied cases that may need follow-up.',
      icon: FileWarning,
      tone: 'denied',
    },
    {
      label: 'Approved Auths',
      count: approvedCount,
      description: 'Completed approvals in the selected filters.',
      icon: CheckCircle2,
      tone: 'complete',
    },
  ];
}

function getToneClasses(tone: WorkflowItem['tone'] | DatedWorkflowItem['tone'], darkMode: boolean) {
  if (tone === 'overdue') {
    return darkMode
      ? 'border-red-900/70 bg-red-950/40 text-red-200'
      : 'border-red-200 bg-red-50 text-red-700';
  }

  if (tone === 'due') {
    return darkMode
      ? 'border-orange-900/70 bg-orange-950/40 text-orange-200'
      : 'border-orange-200 bg-orange-50 text-orange-700';
  }

  if (tone === 'pending') {
    return darkMode
      ? 'border-amber-900/60 bg-amber-950/30 text-amber-200'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (tone === 'p2p') {
    return darkMode
      ? 'border-blue-900/60 bg-blue-950/30 text-blue-200'
      : 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (tone === 'appeal') {
    return darkMode
      ? 'border-purple-900/60 bg-purple-950/30 text-purple-200'
      : 'border-purple-200 bg-purple-50 text-purple-700';
  }

  if (tone === 'denied') {
    return darkMode
      ? 'border-red-900/60 bg-red-950/30 text-red-200'
      : 'border-red-200 bg-red-50 text-red-700';
  }

  return darkMode
    ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

export function UpcomingWorkflowCard({ data, darkMode }: UpcomingWorkflowCardProps) {
  const datedWorkflowItems = getDatedWorkflowItems(data);
  const workflowItems = getWorkflowItems(data);
  const activeItems = workflowItems.filter((item) => item.count > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center">
        <p className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
          No workflow items found for the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {datedWorkflowItems.length > 0 && (
        <div className="space-y-2">
          <p className={cn('text-xs font-semibold uppercase tracking-wide', darkMode ? 'text-gray-400' : 'text-gray-500')}>
            Next date-based items
          </p>

          {datedWorkflowItems.map((item) => (
            <div
              key={`${item.auth.id}-${item.label}-${item.dateLabel}`}
              className={cn('rounded-xl border px-4 py-3 text-sm', getToneClasses(item.tone, darkMode))}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {item.label}: {item.auth.patientId}
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    {item.auth.facility} • {item.auth.loc} • {item.auth.payer}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold">{item.dateLabel}</p>
                  <p className="mt-1 text-xs opacity-80">{getDatePhrase(item.daysUntil)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {workflowItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className={cn(
                'rounded-xl border px-4 py-3 transition-colors',
                item.count > 0
                  ? getToneClasses(item.tone, darkMode)
                  : darkMode
                    ? 'border-gray-800 bg-gray-950/40 text-gray-500'
                    : 'border-gray-200 bg-gray-50 text-gray-500',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs opacity-80">{item.description}</p>
                  </div>
                </div>

                <span className="text-2xl font-bold leading-none">{item.count}</span>
              </div>
            </div>
          );
        })}
      </div>

      {activeItems.length === 0 && (
        <p className={cn('pt-2 text-center text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
          No active follow-up items in the selected filters.
        </p>
      )}
    </div>
  );
}