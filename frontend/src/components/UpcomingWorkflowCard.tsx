import { AlertCircle, CheckCircle2, Clock, FileWarning, RefreshCw } from 'lucide-react';

import { AuthRequest } from '../data/mockData';
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
  tone: 'pending' | 'p2p' | 'appeal' | 'denied' | 'complete';
}

function getWorkflowItems(data: AuthRequest[]): WorkflowItem[] {
  const pendingCount = data.filter((item) => item.status === 'Pending').length;
  const p2pCount = data.filter((item) => item.status === 'P2P').length;
  const appealedCount = data.filter((item) => item.status === 'Appealed').length;
  const deniedCount = data.filter((item) => item.status === 'Denied').length;
  const approvedCount = data.filter((item) => item.status === 'Approved').length;

  return [
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

function getToneClasses(tone: WorkflowItem['tone'], darkMode: boolean) {
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

      {activeItems.length === 0 && (
        <p className={cn('pt-2 text-center text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
          No active follow-up items in the selected filters.
        </p>
      )}
    </div>
  );
}