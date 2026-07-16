import { useEffect, useState, type FormEvent } from "react";
import {
  createUser,
  fetchUsers,
  updateUser,
  type CurrentUser,
} from "../api/security";
import { cn } from "../utils/cn";

const USER_ROLES = ["Admin", "UR", "Read Only"];

interface AdminUsersPageProps {
  darkMode: boolean;
  currentUser: CurrentUser;
}

interface NewUserForm {
  username: string;
  password: string;
  role: string;
}

const emptyUserForm: NewUserForm = {
  username: "",
  password: "",
  role: "UR",
};

export function AdminUsersPage({ darkMode, currentUser }: AdminUsersPageProps) {
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>(emptyUserForm);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  async function loadUsers() {
    setIsLoadingUsers(true);
    setUsersError(null);

    try {
      const loadedUsers = await fetchUsers();
      setUsers(loadedUsers);
    } catch (error) {
      setUsersError(
        error instanceof Error ? error.message : "Unable to load users."
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingUser(true);
    setUsersError(null);

    try {
      const createdUser = await createUser({
        username: newUserForm.username,
        password: newUserForm.password,
        role: newUserForm.role,
      });

      setUsers((currentUsers) =>
        [...currentUsers, createdUser].sort((firstUser, secondUser) =>
          firstUser.username.localeCompare(secondUser.username)
        )
      );
      setNewUserForm(emptyUserForm);
    } catch (error) {
      setUsersError(
        error instanceof Error ? error.message : "Unable to create user."
      );
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleUpdateUser = async (
    user: CurrentUser,
    payload: { role?: string; is_active?: boolean }
  ) => {
    setUpdatingUserId(user.id);
    setUsersError(null);

    try {
      const updatedUser = await updateUser(user.id, payload);

      setUsers((currentUsers) =>
        currentUsers.map((currentUserItem) =>
          currentUserItem.id === updatedUser.id ? updatedUser : currentUserItem
        )
      );
    } catch (error) {
      setUsersError(
        error instanceof Error ? error.message : "Unable to update user."
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section
        className={cn(
          "rounded-xl border p-6 shadow-sm",
          darkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"
        )}
      >
        <div>
          <h2 className="text-lg font-semibold">Create user</h2>
          <p
            className={cn(
              "mt-1 text-sm",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}
          >
            Create local CareQueue users. Do not use shared accounts.
          </p>
        </div>

        <form
          onSubmit={handleCreateUser}
          className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_220px_auto]"
        >
          <label className="space-y-2">
            <span className="text-sm font-medium">Username</span>
            <input
              type="email"
              autoComplete="username"
              value={newUserForm.username}
              onChange={(event) =>
                setNewUserForm((currentForm) => ({
                  ...currentForm,
                  username: event.target.value,
                }))
              }
              required
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm outline-none",
                darkMode
                  ? "border-gray-700 bg-gray-950 text-gray-100"
                  : "border-gray-300 bg-white text-gray-900"
              )}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Temporary password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newUserForm.password}
              onChange={(event) =>
                setNewUserForm((currentForm) => ({
                  ...currentForm,
                  password: event.target.value,
                }))
              }
              required
              minLength={8}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm outline-none",
                darkMode
                  ? "border-gray-700 bg-gray-950 text-gray-100"
                  : "border-gray-300 bg-white text-gray-900"
              )}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Role</span>
            <select
              value={newUserForm.role}
              onChange={(event) =>
                setNewUserForm((currentForm) => ({
                  ...currentForm,
                  role: event.target.value,
                }))
              }
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm outline-none",
                darkMode
                  ? "border-gray-700 bg-gray-950 text-gray-100"
                  : "border-gray-300 bg-white text-gray-900"
              )}
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSavingUser}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-white",
                isSavingUser ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {isSavingUser ? "Creating..." : "Create"}
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
        <div className="border-b border-inherit p-6">
          <h2 className="text-lg font-semibold">Users</h2>
          <p
            className={cn(
              "mt-1 text-sm",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}
          >
            Manage local users, roles, and active status.
          </p>
        </div>

        {usersError && (
          <div
            className={cn(
              "mx-6 mt-4 rounded-lg border px-4 py-3 text-sm",
              darkMode
                ? "border-red-900/60 bg-red-950/40 text-red-200"
                : "border-red-200 bg-red-50 text-red-700"
            )}
          >
            {usersError}
          </div>
        )}

        {isLoadingUsers ? (
          <div
            className={cn(
              "p-6 text-sm",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}
          >
            Loading users...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead
                className={cn(
                  "border-b",
                  darkMode
                    ? "border-gray-800 text-gray-400"
                    : "border-gray-200 text-gray-600"
                )}
              >
                <tr>
                  <th className="px-6 py-3 font-medium">Username</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Last login</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isCurrentUser = user.id === currentUser.id;
                  const isUpdating = updatingUserId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        "border-b last:border-b-0",
                        darkMode ? "border-gray-800" : "border-gray-100"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium">{user.username}</div>
                        {isCurrentUser && (
                          <div
                            className={cn(
                              "mt-1 text-xs",
                              darkMode ? "text-blue-300" : "text-blue-600"
                            )}
                          >
                            Current user
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          disabled={isUpdating || isCurrentUser}
                          onChange={(event) =>
                            handleUpdateUser(user, {
                              role: event.target.value,
                            })
                          }
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm outline-none",
                            darkMode
                              ? "border-gray-700 bg-gray-950 text-gray-100 disabled:text-gray-500"
                              : "border-gray-300 bg-white text-gray-900 disabled:text-gray-500"
                          )}
                        >
                          {USER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            user.is_active
                              ? darkMode
                                ? "bg-green-950 text-green-300"
                                : "bg-green-100 text-green-700"
                              : darkMode
                              ? "bg-gray-800 text-gray-400"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "px-6 py-4",
                          darkMode ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        {user.last_login_at ?? "Never"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          disabled={isUpdating || isCurrentUser}
                          onClick={() =>
                            handleUpdateUser(user, {
                              is_active: !user.is_active,
                            })
                          }
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm font-medium",
                            user.is_active
                              ? darkMode
                                ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-blue-600 text-white hover:bg-blue-700",
                            (isUpdating || isCurrentUser) &&
                              "cursor-not-allowed opacity-50"
                          )}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className={cn(
                        "px-6 py-8 text-center text-sm",
                        darkMode ? "text-gray-400" : "text-gray-600"
                      )}
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
