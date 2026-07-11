import {
  API_BASE_URL,
  authenticatedFetch,
  clearAccessToken,
  setAccessToken,
} from "./client";

export interface CurrentUser {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  password_changed_at: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: CurrentUser;
}

interface CurrentUserResponse {
  user: CurrentUser;
}

export async function loginUser(
  username: string,
  password: string
): Promise<CurrentUser> {
  const response = await fetch(`${API_BASE_URL}/api/security/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid username or password.");
  }

  const data = (await response.json()) as LoginResponse;
  setAccessToken(data.access_token);

  return data.user;
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/security/me`);

  if (!response.ok) {
    clearAccessToken();
    throw new Error("Session expired.");
  }

  const data = (await response.json()) as CurrentUserResponse;
  return data.user;
}

export async function logoutUser(): Promise<void> {
  try {
    await authenticatedFetch(`${API_BASE_URL}/api/security/logout`, {
      method: "POST",
    });
  } finally {
    clearAccessToken();
  }
}
