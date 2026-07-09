import { useEffect, useState } from "react";

import {
  createAuthEvent,
  deleteAuthEvent,
  fetchAuthEvents,
  type AuthEvent,
  type CreateAuthEventPayload,
  type UpdateAuthEventPayload,
  updateAuthEvent,
} from "../api/authEvents";
import type { TimelineEventFormState } from "../components/AuthTimelineSection";
import { sortAuthEventsNewestFirst } from "../utils/authEvents";
import {
  addDaysToDate,
  calculateContinuedStayDefaults,
} from "../utils/authSchedule";

const DEFAULT_TIMELINE_EVENT_FORM: TimelineEventFormState = {
  eventDate: "",
  eventTime: "",
  eventType: "Review",
  outcome: "",
  notes: "",
  requestedDays: "",
  approvedDays: "",
  authStartDate: "",
  authEndDate: "",
  reviewDueDate: "",
};

function resetTimelineEventFormState(): TimelineEventFormState {
  return DEFAULT_TIMELINE_EVENT_FORM;
}

export function useAuthorizationEvents() {
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [isLoadingAuthEvents, setIsLoadingAuthEvents] = useState(false);
  const [isSavingAuthEvent, setIsSavingAuthEvent] = useState(false);
  const [authEventsError, setAuthEventsError] = useState<string | null>(null);
  const [editingAuthEventId, setEditingAuthEventId] = useState<number | null>(
    null
  );
  const [confirmingDeleteAuthEventId, setConfirmingDeleteAuthEventId] =
    useState<number | null>(null);
  const [timelineEventForm, setTimelineEventForm] =
    useState<TimelineEventFormState>(DEFAULT_TIMELINE_EVENT_FORM);

  const [timelineProgrammingDays, setTimelineProgrammingDays] =
    useState("7 days/week");

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
      setAuthEvents(sortAuthEventsNewestFirst(events));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load authorization events.";
      setAuthEventsError(message);
    } finally {
      setIsLoadingAuthEvents(false);
    }
  };

  const handleTimelineEventFieldChange = (
    field: keyof TimelineEventFormState,
    value: string
  ) => {
    setTimelineEventForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [field]: value,
      };

      const shouldRecalculate =
        nextForm.eventType === "Continued Stay" &&
        ["authStartDate", "requestedDays", "approvedDays"].includes(field);

      if (!shouldRecalculate) {
        return nextForm;
      }

      const coveredDays =
        nextForm.approvedDays.trim() || nextForm.requestedDays.trim();

      if (!nextForm.authStartDate || !coveredDays) {
        return nextForm;
      }

      const calculatedEndDate = calculateContinuedStayDefaults({
        previousEndDate: addDaysToDate(nextForm.authStartDate, -1),
        requestedDays: nextForm.requestedDays,
        approvedDays: nextForm.approvedDays,
        programmingDays: timelineProgrammingDays,
      }).authEndDate;

      if (!calculatedEndDate) {
        return nextForm;
      }

      return {
        ...nextForm,
        authEndDate: calculatedEndDate,
        reviewDueDate: calculatedEndDate,
      };
    });
  };

  useEffect(() => {
    if (timelineEventForm.eventType !== "Continued Stay") {
      return;
    }

    const coveredDays =
      timelineEventForm.approvedDays.trim() ||
      timelineEventForm.requestedDays.trim();

    if (!timelineEventForm.authStartDate || !coveredDays) {
      return;
    }

    const calculatedEndDate = calculateContinuedStayDefaults({
      previousEndDate: addDaysToDate(timelineEventForm.authStartDate, -1),
      requestedDays: timelineEventForm.requestedDays,
      approvedDays: timelineEventForm.approvedDays,
      programmingDays: timelineProgrammingDays,
    }).authEndDate;

    if (!calculatedEndDate) {
      return;
    }

    setTimelineEventForm((currentForm) => ({
      ...currentForm,
      authEndDate: calculatedEndDate,
      reviewDueDate: calculatedEndDate,
    }));
  }, [
    timelineEventForm.eventType,
    timelineEventForm.authStartDate,
    timelineEventForm.requestedDays,
    timelineEventForm.approvedDays,
    timelineProgrammingDays,
  ]);

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
        requested_days: Number(timelineEventForm.requestedDays) || 0,
        approved_days: Number(timelineEventForm.approvedDays) || 0,
        auth_start_date: timelineEventForm.authStartDate,
        auth_end_date: timelineEventForm.authEndDate,
        review_due_date: timelineEventForm.reviewDueDate,
      };

      const createdEvent = await createAuthEvent(authId, payload);
      setAuthEvents((currentEvents) =>
        sortAuthEventsNewestFirst([createdEvent, ...currentEvents])
      );
      resetTimelineEventForm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to add timeline event.";
      setAuthEventsError(message);
    } finally {
      setIsSavingAuthEvent(false);
    }
  };

  const handleStartEditTimelineEvent = (event: AuthEvent) => {
    setEditingAuthEventId(event.id);
    setTimelineEventForm({
      eventDate: event.eventDate,
      eventTime: event.eventTime ?? "",
      eventType: event.eventType,
      outcome: event.outcome ?? "",
      notes: event.notes ?? "",
      requestedDays: String(event.requestedDays || ""),
      approvedDays: String(event.approvedDays || ""),
      authStartDate: event.authStartDate ?? "",
      authEndDate: event.authEndDate ?? "",
      reviewDueDate: event.reviewDueDate ?? "",
    });
  };

  const handleCancelEditTimelineEvent = () => {
    resetTimelineEventForm();
  };

  const handleUpdateTimelineEvent = async (
    authId: string,
    eventId: number,
    payload: UpdateAuthEventPayload
  ) => {
    setIsSavingAuthEvent(true);
    setAuthEventsError(null);

    try {
      const updatedEvent = await updateAuthEvent(authId, eventId, payload);

      setAuthEvents((currentEvents) =>
        sortAuthEventsNewestFirst(
          currentEvents.map((event) =>
            event.id === updatedEvent.id ? updatedEvent : event
          )
        )
      );

      resetTimelineEventForm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update timeline event.";
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

  const handleConfirmDeleteTimelineEvent = async (
    authId: string,
    eventId: number
  ) => {
    setIsSavingAuthEvent(true);
    setAuthEventsError(null);

    try {
      await deleteAuthEvent(authId, eventId);
      setAuthEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== eventId)
      );
      setConfirmingDeleteAuthEventId(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete timeline event.";
      setAuthEventsError(message);
    } finally {
      setIsSavingAuthEvent(false);
    }
  };
  const handleStartContinuedStay = (params: {
    programmingDays: string;
    authEndDate: string;
    requestedDays: string;
    approvedDays: string;
  }) => {
    setEditingAuthEventId(null);
    setTimelineProgrammingDays(params.programmingDays || "7 days/week");

    const latestReview = authEvents.find(
      (event) =>
        event.authStartDate ||
        event.authEndDate ||
        event.reviewDueDate ||
        event.requestedDays > 0 ||
        event.approvedDays > 0
    );

    const previousEndDate = latestReview?.authEndDate || params.authEndDate;
    const requestedDays =
      latestReview && latestReview.requestedDays > 0
        ? String(latestReview.requestedDays)
        : params.requestedDays;
    const approvedDays =
      latestReview && latestReview.approvedDays > 0
        ? String(latestReview.approvedDays)
        : params.approvedDays || requestedDays;

    const defaults = calculateContinuedStayDefaults({
      previousEndDate,
      requestedDays,
      approvedDays,
      programmingDays: params.programmingDays || "7 days/week",
    });

    setTimelineEventForm({
      eventDate: defaults.authDate,
      eventTime: "",
      eventType: "Continued Stay",
      outcome: "Pending",
      notes: "Continued stay review started.",
      requestedDays: defaults.requestedDays,
      approvedDays: defaults.approvedDays,
      authStartDate: defaults.authStartDate,
      authEndDate: defaults.authEndDate,
      reviewDueDate: defaults.reviewDueDate,
    });
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
    handleStartContinuedStay,
  };
}
