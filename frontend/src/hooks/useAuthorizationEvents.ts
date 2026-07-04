import { useState } from 'react';

import {
  createAuthEvent,
  deleteAuthEvent,
  fetchAuthEvents,
  type AuthEvent,
  type CreateAuthEventPayload,
  type UpdateAuthEventPayload,
  updateAuthEvent,
} from '../api/authEvents';
import type { TimelineEventFormState } from '../components/AuthTimelineSection';

const DEFAULT_TIMELINE_EVENT_FORM: TimelineEventFormState = {
  eventDate: '',
  eventTime: '',
  eventType: 'Review',
  outcome: '',
  notes: '',
};

function resetTimelineEventFormState(): TimelineEventFormState {
  return DEFAULT_TIMELINE_EVENT_FORM;
}

export function useAuthorizationEvents() {
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [isLoadingAuthEvents, setIsLoadingAuthEvents] = useState(false);
  const [isSavingAuthEvent, setIsSavingAuthEvent] = useState(false);
  const [authEventsError, setAuthEventsError] = useState<string | null>(null);
  const [editingAuthEventId, setEditingAuthEventId] = useState<number | null>(null);
  const [confirmingDeleteAuthEventId, setConfirmingDeleteAuthEventId] = useState<number | null>(
    null,
  );
  const [timelineEventForm, setTimelineEventForm] = useState<TimelineEventFormState>(
    DEFAULT_TIMELINE_EVENT_FORM,
  );

  const resetTimelineEventForm = () => {
    setTimelineEventForm(resetTimelineEventFormState());
    setEditingAuthEventId(null);
  };

  const clearAuthEvents = () => {
    setAuthEvents([]);
    setAuthEventsError(null);
    setEditingAuthEventId(null);
    setConfirmingDeleteAuthEventId(null);
    setTimelineEventForm(resetTimelineEventFormState());
  };

  const loadAuthEvents = async (authId: string) => {
    setIsLoadingAuthEvents(true);
    setAuthEventsError(null);

    try {
      const events = await fetchAuthEvents(authId);
      setAuthEvents(events);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load authorization events.';
      setAuthEventsError(message);
    } finally {
      setIsLoadingAuthEvents(false);
    }
  };

  const handleTimelineEventFieldChange = (
    field: keyof TimelineEventFormState,
    value: string,
  ) => {
    setTimelineEventForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleAddTimelineEvent = async (authId: string) => {
    setIsSavingAuthEvent(true);
    setAuthEventsError(null);

    try {
      const payload: CreateAuthEventPayload = {
        event_date: timelineEventForm.eventDate,
        event_time: timelineEventForm.eventTime,
        event_type: timelineEventForm.eventType,
        outcome: timelineEventForm.outcome,
        notes: timelineEventForm.notes,
      };

      const createdEvent = await createAuthEvent(authId, payload);
      setAuthEvents((currentEvents) => [createdEvent, ...currentEvents]);
      resetTimelineEventForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add timeline event.';
      setAuthEventsError(message);
    } finally {
      setIsSavingAuthEvent(false);
    }
  };

  const handleStartEditTimelineEvent = (event: AuthEvent) => {
    setEditingAuthEventId(event.id);
    setTimelineEventForm({
      eventDate: event.eventDate,
      eventTime: event.eventTime ?? '',
      eventType: event.eventType,
      outcome: event.outcome ?? '',
      notes: event.notes ?? '',
    });
  };

  const handleCancelEditTimelineEvent = () => {
    resetTimelineEventForm();
  };

  const handleUpdateTimelineEvent = async (
    eventId: number,
    payload: UpdateAuthEventPayload,
  ) => {
    setIsSavingAuthEvent(true);
    setAuthEventsError(null);

    try {
      const updatedEvent = await updateAuthEvent(eventId, payload);

      setAuthEvents((currentEvents) =>
        currentEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
      );

      resetTimelineEventForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update timeline event.';
      setAuthEventsError(message);
    } finally {
      setIsSavingAuthEvent(false);
    }
  };

  const handleStartDeleteTimelineEvent = (eventId: number) => {
    setConfirmingDeleteAuthEventId(eventId);
  };

  const handleCancelDeleteTimelineEvent = () => {
    setConfirmingDeleteAuthEventId(null);
  };

  const handleConfirmDeleteTimelineEvent = async (eventId: number) => {
    setIsSavingAuthEvent(true);
    setAuthEventsError(null);

    try {
      await deleteAuthEvent(eventId);
      setAuthEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId));
      setConfirmingDeleteAuthEventId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete timeline event.';
      setAuthEventsError(message);
    } finally {
      setIsSavingAuthEvent(false);
    }
  };

  const handlePrefillTimelineFromLastEvent = () => {
    const latestEvent = authEvents[0];

    if (!latestEvent) {
      return;
    }

    setTimelineEventForm((currentForm) => ({
      ...currentForm,
      eventDate: latestEvent.eventDate,
      eventTime: latestEvent.eventTime ?? '',
    }));
  };

  return {
    authEvents,
    setAuthEvents,
    isLoadingAuthEvents,
    isSavingAuthEvent,
    authEventsError,
    setAuthEventsError,
    editingAuthEventId,
    confirmingDeleteAuthEventId,
    timelineEventForm,
    resetTimelineEventForm,
    clearAuthEvents,
    loadAuthEvents,
    handleTimelineEventFieldChange,
    handleAddTimelineEvent,
    handleStartEditTimelineEvent,
    handleCancelEditTimelineEvent,
    handleUpdateTimelineEvent,
    handleStartDeleteTimelineEvent,
    handleCancelDeleteTimelineEvent,
    handleConfirmDeleteTimelineEvent,
    handlePrefillTimelineFromLastEvent,
  };
}