import { useEffect, useState } from "react";

import type { PdfIntakeCandidate, PdfIntakePreview } from "../api/pdfIntake";
import type { NewAuthFormState } from "../hooks/useAuthorizationForm";
import { cn } from "../utils/cn";

type MemberIdentifierSource = "behavioral_health" | "medical" | "none";

export type PdfIntakeFormValues = Partial<
  Pick<
    NewAuthFormState,
    | "clientName"
    | "memberId"
    | "groupNumber"
    | "dateOfBirth"
    | "facility"
    | "startDate"
    | "insurance"
    | "phoneNumber"
  >
>;

interface PdfIntakeReviewPanelProps {
  preview: PdfIntakePreview;
  darkMode: boolean;
  onApply: (values: PdfIntakeFormValues) => void;
  onCancel: () => void;
}

interface ReviewValues {
  clientName: string;
  dateOfBirth: string;
  facility: string;
  startDate: string;
  insurance: string;
  authorizationPhone: string;
  medicalMemberId: string;
  medicalGroupNumber: string;
  behavioralHealthMemberId: string;
  behavioralHealthGroupNumber: string;
}

function candidateValue(candidate: PdfIntakeCandidate | null): string {
  return candidate?.value ?? "";
}

function normalizeDate(value: string): string {
  const trimmedValue = value.trim();

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);

  if (isoMatch) {
    return trimmedValue;
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmedValue);

  if (!slashMatch) {
    return "";
  }

  const [, month, day, year] = slashMatch;

  return [year, month.padStart(2, "0"), day.padStart(2, "0")].join("-");
}

function firstDateFromRange(value: string): string {
  const firstDate =
    value.match(/\b(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/)?.[0] ?? "";

  return normalizeDate(firstDate);
}

function getInitialIdentifierSource(
  preview: PdfIntakePreview
): MemberIdentifierSource {
  if (
    preview.behavioral_health_member_id ||
    preview.behavioral_health_group_number
  ) {
    return "behavioral_health";
  }

  if (preview.medical_member_id || preview.medical_group_number) {
    return "medical";
  }

  return "none";
}

function getInitialValues(preview: PdfIntakePreview): ReviewValues {
  return {
    clientName: candidateValue(preview.client_name),
    dateOfBirth: normalizeDate(candidateValue(preview.date_of_birth)),
    facility: candidateValue(preview.facility),
    startDate: firstDateFromRange(candidateValue(preview.admit_date_range)),
    insurance: candidateValue(preview.insurance),
    authorizationPhone: candidateValue(preview.authorization_phone),
    medicalMemberId: candidateValue(preview.medical_member_id),
    medicalGroupNumber: candidateValue(preview.medical_group_number),
    behavioralHealthMemberId: candidateValue(
      preview.behavioral_health_member_id
    ),
    behavioralHealthGroupNumber: candidateValue(
      preview.behavioral_health_group_number
    ),
  };
}

function CandidateSourceLabel({
  candidate,
  darkMode,
}: {
  candidate: PdfIntakeCandidate | null;
  darkMode: boolean;
}) {
  if (!candidate) {
    return null;
  }

  return (
    <span
      className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-500")}
    >
      Extracted from{" "}
      {candidate.source === "form_field" ? "fillable field" : "embedded text"}
    </span>
  );
}

export function PdfIntakeReviewPanel({
  preview,
  darkMode,
  onApply,
  onCancel,
}: PdfIntakeReviewPanelProps) {
  const [values, setValues] = useState<ReviewValues>(() =>
    getInitialValues(preview)
  );
  const [identifierSource, setIdentifierSource] =
    useState<MemberIdentifierSource>(() => getInitialIdentifierSource(preview));

  useEffect(() => {
    setValues(getInitialValues(preview));
    setIdentifierSource(getInitialIdentifierSource(preview));
  }, [preview]);

  const updateValue = (field: keyof ReviewValues, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleApply = () => {
    let memberId = "";
    let groupNumber = "";

    if (identifierSource === "behavioral_health") {
      memberId = values.behavioralHealthMemberId;
      groupNumber = values.behavioralHealthGroupNumber;
    } else if (identifierSource === "medical") {
      memberId = values.medicalMemberId;
      groupNumber = values.medicalGroupNumber;
    }

    onApply({
      clientName: values.clientName,
      memberId,
      groupNumber,
      dateOfBirth: values.dateOfBirth,
      facility: values.facility,
      startDate: values.startDate,
      insurance: values.insurance,
      phoneNumber: values.authorizationPhone,
    });
  };

  const inputClassName = cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500",
    darkMode
      ? "border-gray-700 bg-gray-950 text-gray-100"
      : "border-gray-300 bg-white text-gray-900"
  );

  const labelClassName = cn(
    "text-sm font-medium",
    darkMode ? "text-gray-200" : "text-gray-800"
  );

  return (
    <section
      className={cn(
        "md:col-span-2 rounded-xl border p-4",
        darkMode
          ? "border-blue-900/70 bg-blue-950/20"
          : "border-blue-200 bg-blue-50/70"
      )}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold">Review PDF intake</h3>
        <p
          className={cn(
            "mt-1 text-sm",
            darkMode ? "text-gray-400" : "text-gray-600"
          )}
        >
          Verify and edit every value before applying it to the authorization
          form.
        </p>

        {!preview.template_matched && (
          <p
            className={cn(
              "mt-2 rounded-lg border px-3 py-2 text-sm",
              darkMode
                ? "border-amber-900 bg-amber-950/40 text-amber-200"
                : "border-amber-300 bg-amber-50 text-amber-800"
            )}
          >
            This PDF did not match a supported template. No values may be
            available.
          </p>
        )}

        {!preview.has_usable_text && (
          <p
            className={cn(
              "mt-2 rounded-lg border px-3 py-2 text-sm",
              darkMode
                ? "border-amber-900 bg-amber-950/40 text-amber-200"
                : "border-amber-300 bg-amber-50 text-amber-800"
            )}
          >
            The PDF did not contain enough embedded text for text-based
            extraction.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className={labelClassName}>Client Name</span>
          <input
            type="text"
            value={values.clientName}
            onChange={(event) => updateValue("clientName", event.target.value)}
            className={inputClassName}
          />
          <CandidateSourceLabel
            candidate={preview.client_name}
            darkMode={darkMode}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClassName}>Date of Birth</span>
          <input
            type="date"
            value={values.dateOfBirth}
            onChange={(event) => updateValue("dateOfBirth", event.target.value)}
            className={inputClassName}
          />
          <CandidateSourceLabel
            candidate={preview.date_of_birth}
            darkMode={darkMode}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClassName}>Facility</span>
          <input
            type="text"
            value={values.facility}
            onChange={(event) => updateValue("facility", event.target.value)}
            className={inputClassName}
          />
          <CandidateSourceLabel
            candidate={preview.facility}
            darkMode={darkMode}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClassName}>Initial Admit Date</span>
          <input
            type="date"
            value={values.startDate}
            onChange={(event) => updateValue("startDate", event.target.value)}
            className={inputClassName}
          />
          <CandidateSourceLabel
            candidate={preview.admit_date_range}
            darkMode={darkMode}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClassName}>Insurance</span>
          <input
            type="text"
            value={values.insurance}
            onChange={(event) => updateValue("insurance", event.target.value)}
            className={inputClassName}
          />
          <CandidateSourceLabel
            candidate={preview.insurance}
            darkMode={darkMode}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClassName}>Authorization Phone</span>
          <input
            type="tel"
            value={values.authorizationPhone}
            onChange={(event) =>
              updateValue("authorizationPhone", event.target.value)
            }
            className={inputClassName}
          />
          <CandidateSourceLabel
            candidate={preview.authorization_phone}
            darkMode={darkMode}
          />
        </label>
      </div>

      <fieldset
        className={cn(
          "mt-5 rounded-xl border p-4",
          darkMode
            ? "border-gray-800 bg-gray-950/40"
            : "border-gray-200 bg-white"
        )}
      >
        <legend className="px-1 text-sm font-semibold">
          Member and group identifiers
        </legend>

        <p
          className={cn(
            "mb-3 text-xs",
            darkMode ? "text-gray-400" : "text-gray-600"
          )}
        >
          Select which identifier pair should be applied to CareQueue.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div
            className={cn(
              "rounded-lg border p-3",
              identifierSource === "behavioral_health"
                ? darkMode
                  ? "border-blue-500 bg-blue-950/30"
                  : "border-blue-500 bg-blue-50"
                : darkMode
                ? "border-gray-800"
                : "border-gray-200"
            )}
          >
            <label className="mb-3 flex items-center gap-2 text-sm font-medium">
              <input
                type="radio"
                name="pdf-identifier-source"
                value="behavioral_health"
                checked={identifierSource === "behavioral_health"}
                onChange={() => setIdentifierSource("behavioral_health")}
              />
              Behavioral health identifiers
            </label>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className={labelClassName}>Member ID</span>
                <input
                  type="text"
                  value={values.behavioralHealthMemberId}
                  onChange={(event) =>
                    updateValue("behavioralHealthMemberId", event.target.value)
                  }
                  className={inputClassName}
                />
                <CandidateSourceLabel
                  candidate={preview.behavioral_health_member_id}
                  darkMode={darkMode}
                />
              </label>

              <label className="block space-y-1">
                <span className={labelClassName}>Group Number</span>
                <input
                  type="text"
                  value={values.behavioralHealthGroupNumber}
                  onChange={(event) =>
                    updateValue(
                      "behavioralHealthGroupNumber",
                      event.target.value
                    )
                  }
                  className={inputClassName}
                />
                <CandidateSourceLabel
                  candidate={preview.behavioral_health_group_number}
                  darkMode={darkMode}
                />
              </label>
            </div>
          </div>

          <div
            className={cn(
              "rounded-lg border p-3",
              identifierSource === "medical"
                ? darkMode
                  ? "border-blue-500 bg-blue-950/30"
                  : "border-blue-500 bg-blue-50"
                : darkMode
                ? "border-gray-800"
                : "border-gray-200"
            )}
          >
            <label className="mb-3 flex items-center gap-2 text-sm font-medium">
              <input
                type="radio"
                name="pdf-identifier-source"
                value="medical"
                checked={identifierSource === "medical"}
                onChange={() => setIdentifierSource("medical")}
              />
              Medical identifiers
            </label>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className={labelClassName}>Member ID</span>
                <input
                  type="text"
                  value={values.medicalMemberId}
                  onChange={(event) =>
                    updateValue("medicalMemberId", event.target.value)
                  }
                  className={inputClassName}
                />
                <CandidateSourceLabel
                  candidate={preview.medical_member_id}
                  darkMode={darkMode}
                />
              </label>

              <label className="block space-y-1">
                <span className={labelClassName}>Group Number</span>
                <input
                  type="text"
                  value={values.medicalGroupNumber}
                  onChange={(event) =>
                    updateValue("medicalGroupNumber", event.target.value)
                  }
                  className={inputClassName}
                />
                <CandidateSourceLabel
                  candidate={preview.medical_group_number}
                  darkMode={darkMode}
                />
              </label>
            </div>
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="pdf-identifier-source"
            value="none"
            checked={identifierSource === "none"}
            onChange={() => setIdentifierSource("none")}
          />
          Do not apply a member ID or group number
        </label>
      </fieldset>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium",
            darkMode
              ? "border-gray-700 text-gray-200 hover:bg-gray-900"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          )}
        >
          Cancel PDF intake
        </button>

        <button
          type="button"
          onClick={handleApply}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Apply to authorization
        </button>
      </div>
    </section>
  );
}
