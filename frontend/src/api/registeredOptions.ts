import { API_BASE_URL, authenticatedFetch } from "./client";

export type RegisteredOptionCategory = "facility" | "insurance" | "web_portal";

export interface RegisteredOption {
  id: number;
  category: RegisteredOptionCategory;
  name: string;
  is_protected: boolean;
  created_at: string;
  updated_at: string;
}

interface RegisteredOptionListResponse {
  options: RegisteredOption[];
}

interface RegisteredOptionDeleteResponse {
  deleted: boolean;
}

async function readErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string };

    if (data.detail) {
      return data.detail;
    }
  } catch {
    // Use the generic message when the response is not JSON.
  }

  return fallbackMessage;
}

export async function fetchRegisteredOptions(
  category?: RegisteredOptionCategory
): Promise<RegisteredOption[]> {
  const searchParams = new URLSearchParams();

  if (category) {
    searchParams.set("category", category);
  }

  const query = searchParams.toString();
  const url = `${API_BASE_URL}/api/registered-options${
    query ? `?${query}` : ""
  }`;

  const response = await authenticatedFetch(url);

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Unable to load registered options.")
    );
  }

  const data = (await response.json()) as RegisteredOptionListResponse;

  return data.options;
}

export async function createRegisteredOption(
  category: RegisteredOptionCategory,
  name: string
): Promise<RegisteredOption> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/registered-options`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category,
        name,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Unable to create registered option.")
    );
  }

  return (await response.json()) as RegisteredOption;
}

export async function deleteRegisteredOption(optionId: number): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/registered-options/${optionId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Unable to delete registered option.")
    );
  }

  const data = (await response.json()) as RegisteredOptionDeleteResponse;

  if (!data.deleted) {
    throw new Error("Unable to delete registered option.");
  }
}
