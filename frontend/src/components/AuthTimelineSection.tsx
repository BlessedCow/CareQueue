import type { AuthEvent, UpdateAuthEventPayload } from '../api/authEvents';
import { cn } from '../utils/cn';

export interface TimelineEventFormState {
  eventDate: string;
  eventTime: string;
  eventType: string;
  outcome: string;
  notes: string;
}

interface AuthTimelineSectionProps {
  darkMode: boolean;
  events: AuthEvent[];
  eventForm: TimelineEventFormState;
  isSavingEvent: boolean;
  editingEventId: number | null;
  onEventFieldChange: (field: keyof TimelineEventFormState, value: string) => void;
  onAddEvent: () => void;
  onStartEditEvent: (event: AuthEvent) => void;
  onCancelEditEvent: () => void;
  onUpdateEvent: (eventId: number, payload: UpdateAuthEventPayload) => void;
  onDeleteEvent: (eventId: number) => void;
}
  
const EVENT_TYPES = [
  'Request Submitted',
  'Payer Response',
  'Peer Review',
  'Appeal',
  'Additional Clinical Sent',
  'More Information Requested',
  'Review Scheduled',
  'Facility Updated',
  'Other',
];
  
const OUTCOMES = [
  '',
  'Pending',
  'Approved',
  'Denied',
  'Denied with Peer Review Option',
  'More Information Needed',
  'No PA Required',
  'Scheduled',
  'Completed',
  'Submitted',
  'Appeal Pending',
  'Appeal Approved',
  'Appeal Denied',
  'Upheld',
  'Overturned',
  'Other',
];

export function AuthTimelineSection({
  darkMode,
  events,
  eventForm,
  isSavingEvent,
  editingEventId,
  onEventFieldChange,
  onAddEvent,
  onStartEditEvent,
  onCancelEditEvent,
  onUpdateEvent,
  onDeleteEvent,
}: AuthTimelineSectionProps) {
  const handleSubmitEvent = () => {
    if (!eventForm.eventDate.trim()) {
      return;
    }

    const payload = {
      event_type: eventForm.eventType,
      event_date: eventForm.eventDate,
      event_time: eventForm.eventTime,
      outcome: eventForm.outcome,
      notes: eventForm.notes.trim(),
    };

    if (editingEventId) {
      onUpdateEvent(editingEventId, payload);
      return;
    }

    onAddEvent();
  };

  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50',
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className={cn('text-sm font-semibold', darkMode ? 'text-gray-100' : 'text-gray-900')}>
            Auth Timeline
          </h3>
          <p className={cn('mt-1 text-xs', darkMode ? 'text-gray-400' : 'text-gray-500')}>
            Track request dates, payer outcomes, peer reviews, appeals, and follow-up notes.
          </p>
        </div>
      </div>

      <div
        className={cn(
          'mb-3 rounded-xl border px-4 py-3 text-sm',
          editingEventId
            ? darkMode
              ? 'border-blue-900/70 bg-blue-950/40 text-blue-200'
              : 'border-blue-200 bg-blue-50 text-blue-700'
            : darkMode
              ? 'border-gray-800 bg-gray-950 text-gray-400'
              : 'border-gray-200 bg-white text-gray-600',
        )}
      >
        {editingEventId
          ? 'Editing timeline event. Save changes or cancel edit before adding another event.'
          : 'Add a timeline event using the real request or outcome date, not necessarily today’s date.'}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className={cn('mb-1 block text-xs font-medium', darkMode ? 'text-gray-300' : 'text-gray-600')}>
            Event Date
          </label>
          <input
            type="date"
            value={eventForm.eventDate}
            onChange={(event) => onEventFieldChange('eventDate', event.target.value)}
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              darkMode
                ? 'border-gray-700 bg-gray-950 text-gray-100 focus:border-blue-500'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500',
            )}
          />
        </div>

        <div>
          <label className={cn('mb-1 block text-xs font-medium', darkMode ? 'text-gray-300' : 'text-gray-600')}>
            Time Optional
          </label>
          <input
            type="time"
            value={eventForm.eventTime}
            onChange={(event) => onEventFieldChange('eventTime', event.target.value)}
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              darkMode
                ? 'border-gray-700 bg-gray-950 text-gray-100 focus:border-blue-500'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500',
            )}
          />
        </div>

        <div>
          <label className={cn('mb-1 block text-xs font-medium', darkMode ? 'text-gray-300' : 'text-gray-600')}>
            Event Type
          </label>
          <select
            value={eventForm.eventType}
            onChange={(event) => onEventFieldChange('eventType', event.target.value)}
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              darkMode
                ? 'border-gray-700 bg-gray-950 text-gray-100 focus:border-blue-500'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500',
            )}
          >
            {EVENT_TYPES.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={cn('mb-1 block text-xs font-medium', darkMode ? 'text-gray-300' : 'text-gray-600')}>
            Outcome / Result
          </label>
          <select
            value={eventForm.outcome}
            onChange={(event) => onEventFieldChange('outcome', event.target.value)}
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              darkMode
                ? 'border-gray-700 bg-gray-950 text-gray-100 focus:border-blue-500'
                : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500',
            )}
          >
            {OUTCOMES.map((outcome) => (
              <option key={outcome || 'none'} value={outcome}>
                {outcome || 'None'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label className={cn('mb-1 block text-xs font-medium', darkMode ? 'text-gray-300' : 'text-gray-600')}>
          Timeline Notes
        </label>
        <textarea
          value={eventForm.notes}
          onChange={(event) => onEventFieldChange('notes', event.target.value)}
          placeholder="Example: Insurance denied auth as not medically necessary. Peer review available at 555-555-5555."
          rows={3}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
            darkMode
              ? 'border-gray-700 bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:border-blue-500'
              : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500',
          )}
        />
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={handleSubmitEvent}
          disabled={isSavingEvent || !eventForm.eventDate.trim()}
          className={cn(
            'inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
            darkMode
              ? 'bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400'
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500',
          )}
        >
          {isSavingEvent ? 'Saving Event...' : editingEventId ? 'Save Timeline Event' : '+ Add Timeline Event'}
        </button>

        {editingEventId && (
          <button
            type="button"
            onClick={onCancelEditEvent}
            className={cn(
              'ml-3 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100',
            )}
          >
            Cancel Edit
          </button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {events.length === 0 ? (
          <p className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>
            No timeline events added yet.
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={cn(
                'rounded-xl border p-3',
                editingEventId === event.id
                  ? darkMode
                    ? 'border-blue-800 bg-blue-950/30'
                    : 'border-blue-300 bg-blue-50'
                  : darkMode
                    ? 'border-gray-700 bg-gray-950'
                    : 'border-gray-200 bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={cn('text-sm font-semibold', darkMode ? 'text-gray-100' : 'text-gray-900')}>
                    {event.eventType}
                    {event.outcome ? ` - ${event.outcome}` : ''}
                  </div>
                  <div className={cn('mt-1 text-xs', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                    {event.eventDate}
                    {event.eventTime ? ` at ${event.eventTime}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onStartEditEvent(event)}
                  className={cn(
                    'text-xs font-medium transition-colors',
                    darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700',
                  )}
                >
                  {editingEventId === event.id ? 'Editing' : 'Edit'}
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteEvent(event.id)}
                  className={cn(
                    'text-xs font-medium transition-colors',
                    darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700',
                  )}
                >
                  Delete
                </button>
              </div>
              </div>

              {event.notes ? (
                <p className={cn('mt-2 whitespace-pre-wrap text-sm', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                  {event.notes}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}