import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { AuthRequest } from '../types/auth';
import { cn } from '../utils/cn';

interface CalendarPageProps {
  data: AuthRequest[];
  darkMode: boolean;
  onSelectAuth: (auth: AuthRequest) => void;
}

interface CalendarEvent {
  id: string;
  date: Date;
  dateKey: string;
  label: string;
  auth: AuthRequest;
  tone: 'start' | 'review' | 'lcd' | 'complete';
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
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

function parseDateLike(value?: string | null) {
    if (!value) {
      return null;
    }
  
    const dateOnly = parseDateOnly(value.slice(0, 10));
  
    if (dateOnly) {
      return dateOnly;
    }
  
    const parsedDate = new Date(value);
  
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }
  
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getCalendarDays(monthDate: Date) {
  const firstDay = startOfMonth(monthDate);
  const lastDay = endOfMonth(monthDate);
  const calendarStart = new Date(firstDay);
  calendarStart.setDate(firstDay.getDate() - firstDay.getDay());

  const calendarEnd = new Date(lastDay);
  calendarEnd.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days: Date[] = [];
  const currentDate = new Date(calendarStart);

  while (currentDate <= calendarEnd) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
}

function getEventToneClasses(tone: CalendarEvent['tone'], darkMode: boolean) {
  if (tone === 'review') {
    return darkMode
      ? 'border-orange-900/70 bg-orange-950/40 text-orange-200 hover:bg-orange-900/50'
      : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100';
  }

  if (tone === 'lcd') {
    return darkMode
      ? 'border-red-900/70 bg-red-950/40 text-red-200 hover:bg-red-900/50'
      : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100';
  }

  if (tone === 'complete') {
    return darkMode
      ? 'border-emerald-900/70 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/50'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
  }

  return darkMode
    ? 'border-blue-900/70 bg-blue-950/40 text-blue-200 hover:bg-blue-900/50'
    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100';
}

function buildCalendarEvents(data: AuthRequest[]): CalendarEvent[] {
    const events: CalendarEvent[] = [];
  
    data.forEach((auth) => {
      const authStartDate = parseDateOnly(auth.dateStr);
      const reviewDueDate = parseDateOnly(auth.reviewDueDate);
      const authEndDate = parseDateOnly(auth.authEndDate);
      const completedDate = parseDateLike(auth.decisionAt);
  
      if (authStartDate) {
        events.push({
          id: `${auth.id}-start`,
          date: authStartDate,
          dateKey: getDateKey(authStartDate),
          label: 'Auth Start',
          auth,
          tone: 'start',
        });
      }
  
      if (reviewDueDate) {
        events.push({
          id: `${auth.id}-review`,
          date: reviewDueDate,
          dateKey: getDateKey(reviewDueDate),
          label: 'Review Due',
          auth,
          tone: 'review',
        });
      }

      if (completedDate && (auth.status === 'Approved' || auth.status === 'No PA Required')) {
        events.push({
          id: `${auth.id}-complete`,
          date: completedDate,
          dateKey: getDateKey(completedDate),
          label: 'Completed Auth',
          auth,
          tone: 'complete',
        });
      }
    });
  
    return events.sort((firstEvent, secondEvent) => firstEvent.date.getTime() - secondEvent.date.getTime());
  }

function isToday(date: Date) {
  return getDateKey(date) === getDateKey(new Date());
}

const CALENDAR_LEGEND_ITEMS: { label: string; tone: CalendarEvent['tone'] }[] = [
    { label: 'Auth Start', tone: 'start' },
    { label: 'Review Due', tone: 'review' },
    { label: 'Completed Auth', tone: 'complete' },
  ];

export function CalendarPage({ data, darkMode, onSelectAuth }: CalendarPageProps) {
    const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [showLegend, setShowLegend] = useState(true);

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const events = useMemo(() => buildCalendarEvents(data), [data]);

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((groupedEvents, event) => {
      groupedEvents[event.dateKey] = groupedEvents[event.dateKey] ?? [];
      groupedEvents[event.dateKey].push(event);
      return groupedEvents;
    }, {});
  }, [events]);
  
  const selectedDateEvents = selectedDateKey ? eventsByDate[selectedDateKey] ?? [] : [];
  
  const selectedDateLabel = selectedDateKey
    ? formatShortDate(parseDateOnly(selectedDateKey) ?? new Date())
    : '';
  
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter((event) => event.date >= today)
      .slice(0, 8);
  }, [events]);

  const visibleMonthIndex = visibleMonth.getMonth();

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'rounded-xl border p-5 shadow-sm',
          darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white',
        )}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Authorization Calendar</h3>
            <p className={cn('mt-1 text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
              Track auth starts and review due dates.
            </p>
          </div>

          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLegend((currentValue) => !currentValue)}
            className={cn(
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                darkMode
                ? 'border-gray-700 text-gray-200 hover:bg-gray-800'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100',
            )}
            >
            {showLegend ? 'Hide Legend' : 'Show Legend'}
            </button>
            
            <button
              type="button"
              onClick={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, -1))}
              className={cn(
                'rounded-lg border p-2 transition-colors',
                darkMode
                  ? 'border-gray-700 text-gray-200 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100',
              )}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="min-w-40 text-center text-sm font-semibold">
              {formatMonthLabel(visibleMonth)}
            </div>

            <button
              type="button"
              onClick={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))}
              className={cn(
                'rounded-lg border p-2 transition-colors',
                darkMode
                  ? 'border-gray-700 text-gray-200 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100',
              )}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setVisibleMonth(startOfMonth(new Date()))}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                darkMode
                  ? 'border-gray-700 text-gray-200 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100',
              )}
            >
              Today
            </button>
          </div>
        </div>

        {showLegend && (
          <div
            className={cn(
              'mb-5 flex flex-wrap gap-2 rounded-xl border p-3',
              darkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-200 bg-gray-50',
            )}
          >
            {CALENDAR_LEGEND_ITEMS.map((item) => (
              <div
                key={item.label}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-medium',
                  getEventToneClasses(item.tone, darkMode),
                )}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}

        <div className="mb-3 grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayLabel) => (
            <div
              key={dayLabel}
              className={cn('text-center text-xs font-semibold uppercase tracking-wide', darkMode ? 'text-gray-500' : 'text-gray-500')}
            >
              {dayLabel}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {calendarDays.map((date) => {
            const dateKey = getDateKey(date);
            const dayEvents = eventsByDate[dateKey] ?? [];
            const isCurrentMonth = date.getMonth() === visibleMonthIndex;

            return (
                <div
                key={dateKey}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDateKey(dateKey)}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                    keyEvent.preventDefault();
                    setSelectedDateKey(dateKey);
                  }
                }}
                className={cn(
                  'min-h-36 cursor-pointer rounded-xl border p-3 text-left transition-colors',
                  darkMode
                    ? 'border-gray-800 bg-gray-950/40 hover:bg-gray-900'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100',
                  !isCurrentMonth && (darkMode ? 'opacity-40' : 'opacity-50'),
                  selectedDateKey === dateKey &&
                    (darkMode ? 'ring-2 ring-blue-400/80' : 'ring-2 ring-blue-500/60'),
                  isToday(date) &&
                    selectedDateKey !== dateKey &&
                    (darkMode ? 'ring-2 ring-blue-500/70' : 'ring-2 ring-blue-500/50'),
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{date.getDate()}</span>
                  {isToday(date) && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        darkMode ? 'bg-blue-950 text-blue-200' : 'bg-blue-100 text-blue-700',
                      )}
                    >
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        onSelectAuth(event.auth);
                      }}
                      className={cn(
                        'block w-full rounded-lg border px-2 py-1.5 text-left text-xs transition-colors',
                        getEventToneClasses(event.tone, darkMode),
                      )}
                    >
                      <span className="block font-semibold">{event.label}</span>
                      <span className="block truncate opacity-80">{event.auth.patientId}</span>
                    </button>
                  ))}

                  {dayEvents.length > 3 && (
                    <p className={cn('text-xs font-medium', darkMode ? 'text-blue-300' : 'text-blue-700')}>
                      +{dayEvents.length - 3} more. Select day to view all.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedDateKey && (
          <div
            className={cn(
              'mt-5 rounded-xl border p-4',
              darkMode ? 'border-gray-800 bg-gray-950/60' : 'border-gray-200 bg-gray-50',
            )}
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold">Calendar Items for {selectedDateLabel}</h4>
                <p className={cn('mt-1 text-xs', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                  Select an item to open authorization details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                  darkMode
                    ? 'border-gray-700 text-gray-200 hover:bg-gray-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100',
                )}
              >
                Close
              </button>
            </div>

            {selectedDateEvents.length === 0 ? (
              <p className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                No calendar items for this day.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {selectedDateEvents.map((event) => (
                  <button
                    key={`selected-${event.id}`}
                    type="button"
                    onClick={() => onSelectAuth(event.auth)}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                      getEventToneClasses(event.tone, darkMode),
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {event.label}: {event.auth.patientId}
                        </p>
                        <p className="mt-1 text-xs opacity-80">
                          {event.auth.facility} • {event.auth.loc} • {event.auth.payer}
                        </p>
                      </div>

                      <p className="shrink-0 text-xs font-semibold">{event.auth.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          'rounded-xl border p-5 shadow-sm',
          darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white',
        )}
      >
        <h3 className="text-lg font-semibold">Upcoming Calendar Items</h3>
        <p className={cn('mt-1 text-sm', darkMode ? 'text-gray-400' : 'text-gray-600')}>
          Next dated authorization events from the selected filters.
        </p>

        {upcomingEvents.length === 0 ? (
          <p className={cn('mt-4 text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
            No upcoming calendar items found.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {upcomingEvents.map((event) => (
              <button
                key={`upcoming-${event.id}`}
                type="button"
                onClick={() => onSelectAuth(event.auth)}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                  getEventToneClasses(event.tone, darkMode),
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {event.label}: {event.auth.patientId}
                    </p>
                    <p className="mt-1 text-xs opacity-80">
                      {event.auth.facility} • {event.auth.loc} • {event.auth.payer}
                    </p>
                  </div>

                  <p className="shrink-0 text-xs font-semibold">{formatShortDate(event.date)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}