import { API_BASE_URL, authenticatedFetch } from "./client";

export interface AuthEvent {
  id: number;
  authId: number;
  eventType: string;
  eventDate: string;
  eventTime: string;
  outcome: string;
  notes: string;
  requestedDays: number;
  approvedDays: number;
  authStartDate: string;
  authEndDate: string;
  reviewDueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAuthEventPayload {
  event_type: string;
  event_date: string;
  event_time?: string;
  outcome?: string;
  notes?: string;
  requested_days?: number;
  approved_days?: number;
  auth_start_date?: string;
  auth_end_date?: string;
  review_due_date?: string;
}

export type UpdateAuthEventPayload = Partial<CreateAuthEventPayload>;

function mapApiEventToAuthEvent(item: any): AuthEvent {
  return {
    id: Number(item.id),
    authId: Number(item.auth_id),
    eventType: item.event_type ?? '',
    eventDate: item.event_date ?? '',
    eventTime: item.event_time ?? '',
    outcome: item.outcome ?? '',
    notes: item.notes ?? '',
    requestedDays: Number(item.requested_days ?? 0),
    approvedDays: Number(item.approved_days ?? 0),
    authStartDate: item.auth_start_date ?? '',
    authEndDate: item.auth_end_date ?? '',
    reviewDueDate: item.review_due_date ?? '',
    createdAt: item.created_at ?? '',
    updatedAt: item.updated_at ?? '',
  };
}

export async function fetchAuthEvents(authId: string): Promise<AuthEvent[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auths/${authId}/events`);

  if (!response.ok) {
    throw new Error(`Failed to fetch authorization events: ${response.status}`);
  }

  const data = await response.json();
  return (data.events ?? []).map(mapApiEventToAuthEvent);
}

export async function createAuthEvent(
  authId: string,
  payload: CreateAuthEventPayload,
): Promise<AuthEvent> {
  const response = await fetch(`${API_BASE_URL}/api/auths/${authId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create authorization event: ${response.status}`);
  }

  const data = await response.json();
  return mapApiEventToAuthEvent(data);
}

export async function updateAuthEvent(
  authId: string,
  eventId: number,
  payload: UpdateAuthEventPayload,
): Promise<AuthEvent> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auths/${authId}/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update authorization event: ${response.status}`);
  }

  const data = await response.json();
  return mapApiEventToAuthEvent(data);
}

export async function deleteAuthEvent(authId: string, eventId: number): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/auths/${authId}/events/${eventId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete authorization event: ${response.status}`);
  }
}