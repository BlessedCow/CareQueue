import type { AuthEvent } from '../api/authEvents';
import type { AuthRequest } from '../data/mockData';
import { cn } from '../utils/cn';

interface AuthorizationReadOnlyViewProps {
  auth: AuthRequest;
  darkMode: boolean;
  events: AuthEvent[];
  isLoadingEvents: boolean;
  eventsError: string | null;
  onClose: () => void;
  onEdit: (auth: AuthRequest) => void;
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }

  return String(value);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function AuthorizationReadOnlyView({
  auth,
  darkMode,
  events,
  isLoadingEvents,
  eventsError,
  onClose,
  onEdit,
}: AuthorizationReadOnlyViewProps) {
  const labelClass = cn('text-xs font-medium uppercase tracking-wide', darkMode ? 'text-gray-500' : 'text-gray-500');
  const valueClass = cn('mt-1 text-sm font-medium', darkMode ? 'text-gray-100' : 'text-gray-900');

  return (
    <section
      className={cn(
        'rounded-2xl border p-5 shadow-sm',
        darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white',
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className={cn('text-lg font-semibold', darkMode ? 'text-gray-100' : 'text-gray-900')}>
            View Authorization
          </h2>
          <p className={cn('mt-1 text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
            Read-only authorization details and timeline history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onEdit(auth)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              darkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700',
            )}
          >
            Edit Auth
          </button>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100',
            )}
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <div className={labelClass}>Client</div>
          <div className={valueClass}>{auth.patientId}</div>
        </div>

        <div>
          <div className={labelClass}>Facility</div>
          <div className={valueClass}>{auth.facility}</div>
        </div>

        <div>
          <div className={labelClass}>Insurance</div>
          <div className={valueClass}>{auth.payer}</div>
        </div>

        <div>
          <div className={labelClass}>Level of Care</div>
          <div className={valueClass}>{formatValue(auth.loc)}</div>
        </div>

        <div>
          <div className={labelClass}>Auth Type</div>
          <div className={valueClass}>{formatValue(auth.authType)}</div>
        </div>

        <div>
          <div className={labelClass}>Status</div>
          <div className={valueClass}>{auth.status}</div>
        </div>

        <div>
          <div className={labelClass}>Requested / Approved Days</div>
          <div className={valueClass}>
            {auth.requestedDays} / {auth.status === 'Pending' ? '-' : auth.approvedDays}
          </div>
        </div>

        <div>
          <div className={labelClass}>Submitted Date</div>
          <div className={valueClass}>{formatDateTime(auth.submittedAt)}</div>
        </div>

        <div>
          <div className={labelClass}>Decision Date</div>
          <div className={valueClass}>{formatDateTime(auth.decisionAt)}</div>
        </div>

        <div className="md:col-span-3">
          <div className={labelClass}>Submission Method</div>
          <div className={valueClass}>{formatValue(auth.submissionMethods)}</div>
        </div>
      </div>

      <div className={cn('my-5 h-px', darkMode ? 'bg-gray-800' : 'bg-gray-200')} />

      <div>
        <h3 className={cn('text-sm font-semibold', darkMode ? 'text-gray-100' : 'text-gray-900')}>
          Timeline Events
        </h3>

        {eventsError && (
          <div
            className={cn(
              'mt-3 rounded-xl border px-4 py-3 text-sm',
              darkMode ? 'border-red-900/70 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-700',
            )}
          >
            {eventsError}
          </div>
        )}

        {isLoadingEvents ? (
          <p className={cn('mt-3 text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>Loading timeline...</p>
        ) : events.length === 0 ? (
          <p className={cn('mt-3 text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
            No timeline events recorded yet.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className={cn(
                  'rounded-xl border p-3',
                  darkMode ? 'border-gray-700 bg-gray-950' : 'border-gray-200 bg-gray-50',
                )}
              >
                <div className={cn('text-sm font-semibold', darkMode ? 'text-gray-100' : 'text-gray-900')}>
                  {event.eventType}
                  {event.outcome ? ` - ${event.outcome}` : ''}
                </div>

                <div className={cn('mt-1 text-xs', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                  {event.eventDate}
                  {event.eventTime ? ` at ${event.eventTime}` : ''}
                </div>

                {event.notes ? (
                  <p className={cn('mt-2 whitespace-pre-wrap text-sm', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    {event.notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}