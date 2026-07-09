const PROGRAMMING_DAY_MAP: Record<string, number[]> = {
  "M-F": [1, 2, 3, 4, 5],
  "M-Sa": [1, 2, 3, 4, 5, 6],
  MWF: [1, 3, 5],
  "7 days/week": [0, 1, 2, 3, 4, 5, 6],
};

const PROGRAMMING_HOURS_MAP: Record<string, number> = {
  PHP: 6,
  IOP: 3,
  OP: 1,
};

function parseDateOnly(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function calculateAuthEndDate(
  startDateValue: string,
  coveredDaysValue: string,
  programmingDays: string
) {
  const startDate = parseDateOnly(startDateValue);
  const coveredDays = Number(coveredDaysValue);
  const allowedDays = PROGRAMMING_DAY_MAP[programmingDays];
  const allowedHours = PROGRAMMING_HOURS_MAP[programmingDays];

  if (
    !startDate ||
    !Number.isInteger(coveredDays) ||
    coveredDays <= 0 ||
    !allowedDays
  ) {
    return "";
  }

  const currentDate = new Date(startDate);
  let countedDays = 0;

  while (countedDays < coveredDays) {
    if (allowedDays.includes(currentDate.getDay())) {
      countedDays += 1;
    }

    if (countedDays === coveredDays) {
      return formatDateOnly(currentDate);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return "";
}

export function addDaysToDate(dateValue: string, numberOfDays: number): string {
  const date = parseDateOnly(dateValue);

  if (!date) {
    return "";
  }

  date.setDate(date.getDate() + numberOfDays);

  return formatDateOnly(date);
}

export interface ContinuedStayDefaults {
  authDate: string;
  authStartDate: string;
  authEndDate: string;
  reviewDueDate: string;
  requestedDays: string;
  approvedDays: string;
}

export function calculateContinuedStayDefaults(params: {
  previousEndDate: string;
  requestedDays: string;
  approvedDays: string;
  programmingDays: string;
}): ContinuedStayDefaults {
  const authDate = formatDateOnly(new Date());

  const authStartDate = addDaysToDate(params.previousEndDate, 1);

  const coveredDays = params.approvedDays || params.requestedDays;

  const authEndDate = calculateAuthEndDate(
    authStartDate,
    coveredDays,
    params.programmingDays
  );
  return {
    authDate,
    authStartDate,
    authEndDate,
    reviewDueDate: authEndDate,
    requestedDays: params.requestedDays,
    approvedDays: params.approvedDays,
  };
}
