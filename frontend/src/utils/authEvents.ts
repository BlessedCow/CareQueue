import type { AuthEvent } from '../api/authEvents';

function getEventSortValue(event: AuthEvent) {
  const eventDate = event.eventDate?.trim();

  if (!eventDate) {
    return Number.NEGATIVE_INFINITY;
  }

  const eventTime = event.eventTime?.trim();
  const normalizedTime = eventTime ? (eventTime.length === 5 ? `${eventTime}:00` : eventTime) : '00:00:00';
  const parsedDate = new Date(`${eventDate}T${normalizedTime}`);

  if (Number.isNaN(parsedDate.getTime())) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsedDate.getTime();
}

export function sortAuthEventsNewestFirst(events: AuthEvent[]) {
  return [...events].sort((firstEvent, secondEvent) => {
    const dateDifference = getEventSortValue(secondEvent) - getEventSortValue(firstEvent);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return secondEvent.id - firstEvent.id;
  });
}

export function formatEventDate(value?: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  const [year, month, day] = value.slice(0, 10).split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
}

export function formatEventTimestamp(eventDate?: string | null, eventTime?: string | null) {
  const formattedDate = formatEventDate(eventDate);

  if (!eventTime) {
    return formattedDate;
  }

  return `${formattedDate} at ${eventTime}`;
}