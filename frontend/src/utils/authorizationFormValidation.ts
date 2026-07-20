import type { NewAuthFormState } from "../hooks/useAuthorizationForm";

export type AuthorizationFormErrors = Partial<
  Record<keyof NewAuthFormState, string>
>;

function isValidIsoDate(value: string): boolean {
  if (!value) {
    return true;
  }

  const match = /^\d{4}-\d{2}-\d{2}$/.exec(value);

  if (!match) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate.toISOString().slice(0, 10) === value;
}

function isFutureDate(value: string): boolean {
  if (!value) {
    return false;
  }

  const today = new Date();
  const normalizedToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const parsedDate = new Date(`${value}T00:00:00`);

  return parsedDate > normalizedToday;
}

export function validateAuthorizationForm(
  form: NewAuthFormState
): AuthorizationFormErrors {
  const errors: AuthorizationFormErrors = {};

  if (!form.clientName.trim()) {
    errors.clientName = "Patient name is required.";
  }

  if (!form.facility.trim()) {
    errors.facility = "Facility is required.";
  }

  if (!form.loc.trim()) {
    errors.loc = "Level of care is required.";
  }

  if (!form.authType.trim()) {
    errors.authType = "Authorization type is required.";
  }

  if (!form.status.trim()) {
    errors.status = "Status is required.";
  }

  if (form.dateOfBirth && !isValidIsoDate(form.dateOfBirth)) {
    errors.dateOfBirth = "Date of birth must use YYYY-MM-DD format.";
  } else if (isFutureDate(form.dateOfBirth)) {
    errors.dateOfBirth = "Date of birth cannot be in the future.";
  }

  if (form.startDate && !isValidIsoDate(form.startDate)) {
    errors.startDate = "Authorization start date must use YYYY-MM-DD format.";
  }

  if (form.endDate && !isValidIsoDate(form.endDate)) {
    errors.endDate = "Authorization end date must use YYYY-MM-DD format.";
  }

  if (form.reviewDueDate && !isValidIsoDate(form.reviewDueDate)) {
    errors.reviewDueDate = "Review due date must use YYYY-MM-DD format.";
  }

  if (
    isValidIsoDate(form.startDate) &&
    isValidIsoDate(form.endDate) &&
    form.startDate &&
    form.endDate &&
    form.endDate < form.startDate
  ) {
    errors.endDate = "Authorization end date cannot be before the start date.";
  }

  return errors;
}

export function hasAuthorizationFormErrors(
  errors: AuthorizationFormErrors
): boolean {
  return Object.keys(errors).length > 0;
}
