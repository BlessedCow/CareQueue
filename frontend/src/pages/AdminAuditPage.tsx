import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  fetchAuditEvents,
  type AuditEvent,
  type AuditEventListResponse,
} from "../api/security";
import { cn } from "../utils/cn";

const PAGE_SIZE = 25;

interface AdminAuditPageProps {
  darkMode: boolean;
}

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString();
}

function formatMetadata(value: string): string {
  if (!value) {
    return "—";
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function AdminAuditPage({ darkMode }: AdminAuditPageProps) {
  const [result, setResult] = useState<AuditEventListResponse>({
    events: [],
    page: 1,
    page_size: PAGE_SIZE,
    total: 0,
  });
  const [actionInput, setActionInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  const loadAuditEvents = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setAuditError(null);

      try {
        const auditEvents = await fetchAuditEvents({
          page,
          pageSize: PAGE_SIZE,
          action: actionFilter,
          username: usernameFilter,
        });

        setResult(auditEvents);
      } catch (error) {
        setAuditError(
          error instanceof Error
            ? error.message
            : "Unable to load audit events."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [actionFilter, usernameFilter]
  );

  useEffect(() => {
    void loadAuditEvents(1);
  }, [loadAuditEvents]);

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionFilter(actionInput.trim());
    setUsernameFilter(usernameInput.trim());
  };

  const handleClearFilters = () => {
    setActionInput("");
    setUsernameInput("");
    setActionFilter("");
    setUsernameFilter("");
  };

  const totalPages = Math.max(1, Math.ceil(result.total / result.page_size));

  return (
    <div className="space-y-6">
      <section
        className={cn(
          "rounded-xl border p-6 shadow-sm",
          darkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"
        )}
      >
        <div>
          <h2 className="text-lg font-semibold">Audit log</h2>
          <p
            className={cn(
              "mt-1 text-sm",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}
          >
            Review security, authorization, timeline, and user-management
            activity.
          </p>
        </div>

        <form
          onSubmit={handleFilterSubmit}
          className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]"
        >
          <label className="space-y-2">
            <span className="text-sm font-medium">Action</span>
            <input
              type="text"
              value={actionInput}
              onChange={(event) => setActionInput(event.target.value)}
              placeholder="Example: auth.update"
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm outline-none",
                darkMode
                  ? "border-gray-700 bg-gray-950 text-gray-100"
                  : "border-gray-300 bg-white text-gray-900"
              )}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Username</span>
            <input
              type="text"
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              placeholder="user@example.com"
              autoComplete="off"
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm outline-none",
                darkMode
                  ? "border-gray-700 bg-gray-950 text-gray-100"
                  : "border-gray-300 bg-white text-gray-900"
              )}
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply filters
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={isLoading}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium",
                darkMode
                  ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                isLoading && "cursor-not-allowed opacity-50"
              )}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section
        className={cn(
          "rounded-xl border shadow-sm",
          darkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"
        )}
      >
        <div className="flex items-center justify-between border-b border-inherit p-6">
          <div>
            <h2 className="text-lg font-semibold">Events</h2>
            <p
              className={cn(
                "mt-1 text-sm",
                darkMode ? "text-gray-400" : "text-gray-600"
              )}
            >
              {result.total} event{result.total === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAuditEvents(result.page)}
            disabled={isLoading}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium",
              darkMode
                ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
              isLoading && "cursor-not-allowed opacity-50"
            )}
          >
            Refresh
          </button>
        </div>

        {auditError && (
          <div
            className={cn(
              "mx-6 mt-4 rounded-lg border px-4 py-3 text-sm",
              darkMode
                ? "border-red-900/60 bg-red-950/40 text-red-200"
                : "border-red-200 bg-red-50 text-red-700"
            )}
          >
            {auditError}
          </div>
        )}

        {isLoading ? (
          <div
            className={cn(
              "p-6 text-sm",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}
          >
            Loading audit events...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead
                  className={cn(
                    "border-b",
                    darkMode
                      ? "border-gray-800 text-gray-400"
                      : "border-gray-200 text-gray-600"
                  )}
                >
                  <tr>
                    <th className="px-6 py-3 font-medium">Time</th>
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                    <th className="px-6 py-3 font-medium">Resource</th>
                    <th className="px-6 py-3 font-medium">Metadata</th>
                    <th className="px-6 py-3 font-medium">IP address</th>
                  </tr>
                </thead>

                <tbody>
                  {result.events.map((event: AuditEvent) => (
                    <tr
                      key={event.id}
                      className={cn(
                        "border-b align-top last:border-b-0",
                        darkMode ? "border-gray-800" : "border-gray-100"
                      )}
                    >
                      <td
                        className={cn(
                          "whitespace-nowrap px-6 py-4",
                          darkMode ? "text-gray-300" : "text-gray-700"
                        )}
                      >
                        {formatTimestamp(event.created_at)}
                      </td>

                      <td className="px-6 py-4">
                        {event.username ?? "System"}
                      </td>

                      <td className="px-6 py-4">
                        <code
                          className={cn(
                            "rounded px-2 py-1 text-xs",
                            darkMode
                              ? "bg-gray-950 text-blue-300"
                              : "bg-gray-100 text-blue-700"
                          )}
                        >
                          {event.action}
                        </code>
                      </td>

                      <td className="px-6 py-4">
                        <div>{event.resource_type}</div>
                        {event.resource_id !== null && (
                          <div
                            className={cn(
                              "mt-1 text-xs",
                              darkMode ? "text-gray-500" : "text-gray-500"
                            )}
                          >
                            ID: {event.resource_id}
                          </div>
                        )}
                      </td>

                      <td className="max-w-[360px] px-6 py-4">
                        <pre
                          className={cn(
                            "max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg p-3 text-xs",
                            darkMode
                              ? "bg-gray-950 text-gray-300"
                              : "bg-gray-50 text-gray-700"
                          )}
                        >
                          {formatMetadata(event.metadata)}
                        </pre>
                      </td>

                      <td
                        className={cn(
                          "px-6 py-4",
                          darkMode ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        {event.ip_address || "—"}
                      </td>
                    </tr>
                  ))}

                  {result.events.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className={cn(
                          "px-6 py-10 text-center text-sm",
                          darkMode ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        No audit events match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              className={cn(
                "flex items-center justify-between border-t px-6 py-4",
                darkMode ? "border-gray-800" : "border-gray-200"
              )}
            >
              <p
                className={cn(
                  "text-sm",
                  darkMode ? "text-gray-400" : "text-gray-600"
                )}
              >
                Page {result.page} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={result.page <= 1 || isLoading}
                  onClick={() => void loadAuditEvents(result.page - 1)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    darkMode
                      ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                    (result.page <= 1 || isLoading) &&
                      "cursor-not-allowed opacity-50"
                  )}
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={result.page >= totalPages || isLoading}
                  onClick={() => void loadAuditEvents(result.page + 1)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    darkMode
                      ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                    (result.page >= totalPages || isLoading) &&
                      "cursor-not-allowed opacity-50"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
